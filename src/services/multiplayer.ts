import { RoomState, CharacterGender, ChatMessage } from '../types/game';
import { storage } from './storage';

class MultiplayerService {
  private activeRoom: RoomState | null = null;
  private listeners: ((room: RoomState | null) => void)[] = [];
  private chatListeners: ((msg: ChatMessage) => void)[] = [];

  constructor() {
    // Check if user was previously in a room
  }

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

  private notify() {
    this.listeners.forEach((cb) => cb(this.activeRoom));
  }

  public createRoom(worldId: number = 1, levelNumber: number = 1): RoomState {
    const profile = storage.getProfile();
    const roomCode = 'TQ-' + Math.floor(1000 + Math.random() * 9000);
    const roomId = 'room_' + Date.now();

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

    this.notify();
    return this.activeRoom;
  }

  public joinRoom(roomCode: string, partnerCharacter?: CharacterGender): { success: boolean; message: string; room?: RoomState } {
    const profile = storage.getProfile();
    const cleanCode = roomCode.trim().toUpperCase();

    // If joining their own or simulated room
    if (this.activeRoom && this.activeRoom.roomCode === cleanCode) {
      if (this.activeRoom.hostId !== profile.id && !this.activeRoom.player2) {
        this.activeRoom.player2 = {
          id: profile.id,
          username: profile.username,
          character: partnerCharacter || (this.activeRoom.player1?.character === 'boy' ? 'girl' : 'boy'),
          ready: false
        };
      }
      this.notify();
      return { success: true, message: 'Joined room successfully!', room: this.activeRoom };
    }

    // Connect to room (or simulate active partner for test room)
    const roomId = 'room_' + cleanCode;
    const isLeoHost = profile.activeCharacter === 'girl';
    const hostName = isLeoHost ? `${profile.boyName || 'Boyfriend'}` : `${profile.girlName || 'Girlfriend'}`;
    const hostChar: CharacterGender = isLeoHost ? 'boy' : 'girl';

    this.activeRoom = {
      roomId,
      roomCode: cleanCode,
      name: `${hostName}'s Quest`,
      hostId: 'host_partner_99',
      worldId: 1,
      levelNumber: 1,
      player1: {
        id: 'host_partner_99',
        username: hostName,
        character: hostChar,
        ready: true
      },
      player2: {
        id: profile.id,
        username: profile.username,
        character: profile.activeCharacter,
        ready: false
      },
      status: 'waiting'
    };

    this.notify();
    return { success: true, message: `Connected to room ${cleanCode}!`, room: this.activeRoom };
  }

  public toggleReady(): void {
    if (!this.activeRoom) return;
    const profile = storage.getProfile();

    if (this.activeRoom.player1 && this.activeRoom.player1.id === profile.id) {
      this.activeRoom.player1.ready = !this.activeRoom.player1.ready;
    } else if (this.activeRoom.player2 && this.activeRoom.player2.id === profile.id) {
      this.activeRoom.player2.ready = !this.activeRoom.player2.ready;
    }

    // Auto ready simulated partner if present
    if (this.activeRoom.player1 && this.activeRoom.player1.id === 'host_partner_99') {
      this.activeRoom.player1.ready = true;
    }

    this.notify();
  }

  public setCharacter(char: CharacterGender): void {
    if (!this.activeRoom) return;
    const profile = storage.getProfile();

    if (this.activeRoom.player1 && this.activeRoom.player1.id === profile.id) {
      this.activeRoom.player1.character = char;
    } else if (this.activeRoom.player2 && this.activeRoom.player2.id === profile.id) {
      this.activeRoom.player2.character = char;
    }

    profile.activeCharacter = char;
    storage.saveProfile(profile);

    this.notify();
  }

  public setRoomLevel(worldId: number, levelNumber: number): void {
    if (!this.activeRoom) return;
    this.activeRoom.worldId = worldId;
    this.activeRoom.levelNumber = levelNumber;
    this.notify();
  }

  public leaveRoom(): void {
    this.activeRoom = null;
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
  }

  public getActiveRoom(): RoomState | null {
    return this.activeRoom;
  }
}

export const multiplayer = new MultiplayerService();
