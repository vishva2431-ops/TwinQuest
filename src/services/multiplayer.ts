import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  RoomState,
  CharacterGender,
  ChatMessage,
  GuestIntent,
  GameEventPayload,
  PlayerNetState
} from '../types/game';
import { storage } from './storage';

export type GameEventListener = (event: GameEventPayload) => void;
export type PlayerStateListener = (state: PlayerNetState) => void;

class MultiplayerService {
  private activeRoom: RoomState | null = null;
  private channel: RealtimeChannel | null = null;
  private isHost: boolean = false;

  private listeners: ((room: RoomState | null) => void)[] = [];
  private chatListeners: ((msg: ChatMessage) => void)[] = [];
  private gameEventListeners: GameEventListener[] = [];
  private playerStateListeners: PlayerStateListener[] = [];

  public subscribe(callback: (room: RoomState | null) => void) {
    this.listeners.push(callback);
    callback(this.activeRoom);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public subscribeChat(callback: (msg: ChatMessage) => void) {
    this.chatListeners.push(callback);
    return () => {
      this.chatListeners = this.chatListeners.filter((cb) => cb !== callback);
    };
  }

  public subscribeGameEvent(callback: GameEventListener) {
    this.gameEventListeners.push(callback);
    return () => {
      this.gameEventListeners = this.gameEventListeners.filter((cb) => cb !== callback);
    };
  }

  public subscribePlayerState(callback: PlayerStateListener) {
    this.playerStateListeners.push(callback);
    return () => {
      this.playerStateListeners = this.playerStateListeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const snapshot = this.activeRoom ? { ...this.activeRoom } : null;
    this.listeners.forEach((cb) => cb(snapshot));
  }

  public isConnectedOnline(): boolean {
    return isSupabaseConfigured && this.channel !== null;
  }

  public getChannel(): RealtimeChannel | null {
    return this.channel;
  }

  public isCurrentHost(): boolean {
    if (!this.activeRoom) return false;
    const profile = storage.getProfile();
    return this.activeRoom.hostId === profile.id;
  }

  /**
   * Create an authoritative room over Supabase Realtime channel
   */
  public createRoom(worldId: number = 1, levelNumber: number = 1): RoomState {
    const profile = storage.getProfile();
    const roomCode = 'TQ-' + Math.floor(1000 + Math.random() * 9000);
    const roomId = 'room_' + Date.now();

    this.cleanupCurrentChannel();

    this.isHost = true;
    this.activeRoom = {
      roomId,
      roomCode,
      name: `${profile.username}'s Adventure`,
      hostId: profile.id,
      worldId,
      levelNumber,
      player1: {
        id: profile.id,
        username: profile.username,
        character: profile.activeCharacter,
        ready: true
      },
      player2: null,
      status: 'waiting'
    };

    if (supabase) {
      const channelName = `room:${roomCode}`;
      const channel = supabase.channel(channelName, {
        config: {
          presence: { key: profile.id },
          broadcast: { self: false }
        }
      });

      // Presence monitoring (detect partner disconnect / join)
      channel
        .on('presence', { event: 'sync' }, () => {
          if (!this.activeRoom || !this.isHost) return;
          const presences = channel.presenceState();
          const activeUserIds = Object.keys(presences);

          // If player2 was set but is no longer present, mark them disconnected
          if (this.activeRoom.player2 && !activeUserIds.includes(this.activeRoom.player2.id)) {
            console.log(`[Multiplayer] Partner ${this.activeRoom.player2.username} disconnected`);
            this.activeRoom.player2 = null;
            if (this.activeRoom.status !== 'finished') {
              this.activeRoom.status = 'waiting';
            }
            this.broadcastRoomState();
            this.notify();
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          if (!this.activeRoom || !this.isHost) return;
          if (this.activeRoom.player2 && this.activeRoom.player2.id === key) {
            console.log(`[Multiplayer] Partner left presence: ${key}`);
            this.activeRoom.player2 = null;
            if (this.activeRoom.status !== 'finished') {
              this.activeRoom.status = 'waiting';
            }
            this.broadcastRoomState();
            this.notify();
          }
        });

      // Broadcast handlers
      channel
        .on('broadcast', { event: 'intent' }, ({ payload }: { payload: GuestIntent }) => {
          this.handleGuestIntent(payload);
        })
        .on('broadcast', { event: 'chat' }, ({ payload }: { payload: ChatMessage }) => {
          storage.addChatMessage(payload);
          this.chatListeners.forEach((cb) => cb(payload));
        })
        .on('broadcast', { event: 'player_state' }, ({ payload }: { payload: PlayerNetState }) => {
          this.playerStateListeners.forEach((cb) => cb(payload));
        })
        .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEventPayload }) => {
          this.gameEventListeners.forEach((cb) => cb(payload));
        });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: profile.id,
            username: profile.username,
            isHost: true,
            joinedAt: Date.now()
          });
          this.broadcastRoomState();
        }
      });

      this.channel = channel;
    } else {
      console.warn('[Multiplayer] Supabase not configured. Room created in offline fallback mode.');
    }

    this.notify();
    return this.activeRoom;
  }

  /**
   * Join an existing room via Supabase Realtime channel
   */
  public async joinRoom(
    roomCode: string,
    partnerCharacter?: CharacterGender
  ): Promise<{ success: boolean; message: string; room?: RoomState }> {
    const cleanCode = roomCode.trim().toUpperCase();

    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      return {
        success: false,
        message: 'Online multiplayer requires Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      };
    }

    const profile = storage.getProfile();
    this.cleanupCurrentChannel();
    this.isHost = false;

    return new Promise((resolve) => {
      let resolved = false;
      const channelName = `room:${cleanCode}`;
      const channel = client.channel(channelName, {
        config: {
          presence: { key: profile.id },
          broadcast: { self: false }
        }
      });

      const timeoutId = window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.cleanupCurrentChannel();
          resolve({ success: false, message: 'Room not found or host unreachable' });
        }
      }, 3500);

      channel
        .on('presence', { event: 'sync' }, () => {
          // If we receive presence, check if host is present
          const presences = channel.presenceState();
          const hasHost = Object.values(presences).some((arr) =>
            arr.some((p: any) => p.isHost === true)
          );
          if (hasHost && !this.activeRoom) {
            // Re-ping host with join request in case initial broadcast occurred before subscribe
            channel.send({
              type: 'broadcast',
              event: 'intent',
              payload: {
                type: 'join_request',
                player: {
                  id: profile.id,
                  username: profile.username,
                  character: partnerCharacter || (profile.activeCharacter === 'boy' ? 'girl' : 'boy')
                }
              } as GuestIntent
            });
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          // If host left, return to waiting/leave
          if (this.activeRoom && this.activeRoom.hostId === key) {
            console.log('[Multiplayer] Host left the room');
            this.activeRoom = null;
            this.notify();
          }
        })
        .on('broadcast', { event: 'room_state' }, ({ payload }: { payload: RoomState }) => {
          this.activeRoom = payload;
          this.notify();

          if (!resolved) {
            // Check if our join was accepted
            if (payload.player2?.id === profile.id) {
              resolved = true;
              clearTimeout(timeoutId);
              resolve({
                success: true,
                message: `Joined room ${cleanCode} as partner!`,
                room: this.activeRoom
              });
            } else if (payload.player2 && payload.player2.id !== profile.id && payload.player1?.id !== profile.id) {
              resolved = true;
              clearTimeout(timeoutId);
              this.cleanupCurrentChannel();
              resolve({ success: false, message: 'Room full (2/2 players already present)' });
            }
          }
        })
        .on('broadcast', { event: 'chat' }, ({ payload }: { payload: ChatMessage }) => {
          storage.addChatMessage(payload);
          this.chatListeners.forEach((cb) => cb(payload));
        })
        .on('broadcast', { event: 'player_state' }, ({ payload }: { payload: PlayerNetState }) => {
          this.playerStateListeners.forEach((cb) => cb(payload));
        })
        .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameEventPayload }) => {
          this.gameEventListeners.forEach((cb) => cb(payload));
        });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.channel = channel;

          await channel.track({
            id: profile.id,
            username: profile.username,
            isHost: false,
            joinedAt: Date.now()
          });

          // Send join request intent to host
          channel.send({
            type: 'broadcast',
            event: 'intent',
            payload: {
              type: 'join_request',
              player: {
                id: profile.id,
                username: profile.username,
                character: partnerCharacter || (profile.activeCharacter === 'boy' ? 'girl' : 'boy')
              }
            } as GuestIntent
          });
        }
      });
    });
  }

  /**
   * Host processes intents received from the guest
   */
  private handleGuestIntent(intent: GuestIntent) {
    if (!this.activeRoom || !this.isHost) return;

    switch (intent.type) {
      case 'join_request': {
        const { player } = intent;
        if (!this.activeRoom.player2) {
          this.activeRoom.player2 = {
            id: player.id,
            username: player.username,
            character: player.character,
            ready: false
          };
          this.broadcastRoomState();
          this.notify();
        } else if (this.activeRoom.player2.id === player.id) {
          // Re-broadcast existing room state for reconnecting guest
          this.broadcastRoomState();
        }
        break;
      }

      case 'toggle_ready': {
        if (this.activeRoom.player2 && this.activeRoom.player2.id === intent.playerId) {
          this.activeRoom.player2.ready = !this.activeRoom.player2.ready;
          this.broadcastRoomState();
          this.notify();
        }
        break;
      }

      case 'set_character': {
        if (this.activeRoom.player2 && this.activeRoom.player2.id === intent.playerId) {
          this.activeRoom.player2.character = intent.character;
          this.broadcastRoomState();
          this.notify();
        }
        break;
      }

      case 'leave': {
        if (this.activeRoom.player2 && this.activeRoom.player2.id === intent.playerId) {
          this.activeRoom.player2 = null;
          if (this.activeRoom.status !== 'finished') {
            this.activeRoom.status = 'waiting';
          }
          this.broadcastRoomState();
          this.notify();
        }
        break;
      }
    }
  }

  public toggleReady(): void {
    if (!this.activeRoom) return;
    const profile = storage.getProfile();

    if (this.isHost && this.activeRoom.player1) {
      this.activeRoom.player1.ready = !this.activeRoom.player1.ready;
      this.broadcastRoomState();
      this.notify();
    } else if (!this.isHost && this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'intent',
        payload: {
          type: 'toggle_ready',
          playerId: profile.id
        } as GuestIntent
      });
    }
  }

  public setCharacter(char: CharacterGender): void {
    if (!this.activeRoom) return;
    const profile = storage.getProfile();

    if (this.isHost && this.activeRoom.player1) {
      this.activeRoom.player1.character = char;
      this.broadcastRoomState();
      this.notify();
    } else if (!this.isHost && this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'intent',
        payload: {
          type: 'set_character',
          playerId: profile.id,
          character: char
        } as GuestIntent
      });
    }

    profile.activeCharacter = char;
    storage.saveProfile(profile);
  }

  public setRoomLevel(worldId: number, levelNumber: number): void {
    if (!this.activeRoom || !this.isHost) return;
    this.activeRoom.worldId = worldId;
    this.activeRoom.levelNumber = levelNumber;
    this.broadcastRoomState();
    this.notify();
  }

  public startOnlineGame(): void {
    if (!this.activeRoom || !this.isHost) return;
    this.activeRoom.status = 'in_game';
    this.broadcastRoomState();
    this.broadcastGameEvent({
      type: 'start',
      worldId: this.activeRoom.worldId,
      levelNumber: this.activeRoom.levelNumber
    });
    this.notify();
  }

  public leaveRoom(): void {
    if (this.channel && !this.isHost) {
      const profile = storage.getProfile();
      this.channel.send({
        type: 'broadcast',
        event: 'intent',
        payload: {
          type: 'leave',
          playerId: profile.id
        } as GuestIntent
      });
    }

    this.cleanupCurrentChannel();
    this.activeRoom = null;
    this.isHost = false;
    this.notify();
  }

  public sendRoomMessage(text: string): void {
    if (!this.activeRoom) return;
    const profile = storage.getProfile();

    const msg: ChatMessage = {
      id: 'room_msg_' + Date.now(),
      senderId: profile.id,
      senderName: profile.username,
      roomId: this.activeRoom.roomId,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isEncrypted: true
    };

    storage.addChatMessage(msg);
    this.chatListeners.forEach((cb) => cb(msg));

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'chat',
        payload: msg
      });
    }
  }

  public broadcastGameEvent(event: GameEventPayload): void {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: event
      });
    }
  }

  public broadcastPlayerState(netState: PlayerNetState): void {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'player_state',
        payload: netState
      });
    }
  }

  public broadcastRoomState(): void {
    if (this.channel && this.activeRoom && this.isHost) {
      this.channel.send({
        type: 'broadcast',
        event: 'room_state',
        payload: this.activeRoom
      });
    }
  }

  private cleanupCurrentChannel(): void {
    if (this.channel && supabase) {
      try {
        supabase.removeChannel(this.channel);
      } catch (err) {
        console.warn('Error removing channel:', err);
      }
      this.channel = null;
    }
  }

  public getActiveRoom(): RoomState | null {
    return this.activeRoom;
  }
}

export const multiplayer = new MultiplayerService();
