# ==============================================================================
# TwinQuest — AnimationTree State Machine & 2D Locomotion Blend Space
# Engine: Godot 4 (GDScript 2.0)
# Art Reference: TwinQuest Official Artwork
# ==============================================================================

class_name TwinQuestAnimationTree
extends AnimationTree

@export var character_body: CharacterBody3D

# Animation State Machine Playback
var state_machine: AnimationNodeStateMachinePlayback

# Blend Space Parameters
const BLEND_PATH_LOCO: String = "parameters/Locomotion/blend_position"
const BLEND_PATH_AIR: String = "parameters/Airborne/blend_position"

var smoothed_speed: float = 0.0
var walk_run_blend: float = 0.0

func _ready() -> void:
	active = true
	state_machine = get("parameters/playback")

func _process(delta: float) -> void:
	if not character_body:
		return

	var vel: Vector3 = character_body.velocity
	var horiz_vel: Vector2 = Vector2(vel.x, vel.z)
	var raw_speed: float = horiz_vel.length()

	# 1. Smooth Locomotion Speed Dampening
	smoothed_speed = lerpf(smoothed_speed, raw_speed, 12.0 * delta)

	# 2. Compute 2D Locomotion Blend Position: (X = Strafing, Y = Forward/Speed)
	# Y in [-1.0, 1.0] where 0 is Idle, 0.4 is Walk, 1.0 is Full Sprint
	var forward_factor: float = clampf(smoothed_speed / 7.0, 0.0, 1.0)
	set(BLEND_PATH_LOCO, Vector2(0.0, forward_factor))

	# 3. State Machine State Transitions
	if character_body.is_on_floor():
		if state_machine.get_current_node() == "Airborne":
			state_machine.travel("Landing")
		else:
			state_machine.travel("Locomotion")
	else:
		state_machine.travel("Airborne")
		# Set airborne rise vs fall blend: -1 = Fall, +1 = Rise
		var vertical_blend: float = clampf(vel.y / 8.0, -1.0, 1.0)
		set(BLEND_PATH_AIR, vertical_blend)
