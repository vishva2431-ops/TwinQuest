# ==============================================================================
# TwinQuest — Full-Body 3D Skeleton Rig & Dynamic Facial Expression Controller
# Engine: Godot 4 (GDScript 2.0)
# Art Reference: TwinQuest Official Artwork (Twin-Quest.png)
# ==============================================================================

class_name TwinQuestCharacterRig
extends CharacterBody3D

@export_enum("boy", "girl") var character_gender: String = "boy"
@export var partner_path: NodePath

# Visual Customization Colors
@export var skin_tone: Color = Color("#ffe4cb")
@export var hair_color: Color = Color("#451a03")
@export var hoodie_color: Color = Color("#2563eb") # Royal blue for Leo, #f43f5e for Maya

# ------------------------------------------------------------------------------
# 1. Full-Body Skeleton3D Bone Hierarchy Node References
# ------------------------------------------------------------------------------
@onready var skeleton: Skeleton3D = $Skeleton3D
@onready var animation_tree: AnimationTree = $AnimationTree
@onready var face_mesh: MeshInstance3D = $Skeleton3D/Bone_Head/FaceMesh
@onready var ponytail_bone: Node3D = $Skeleton3D/Bone_Head/Bone_Ponytail

# ------------------------------------------------------------------------------
# 2. Expressive Facial State Machine Variables
# ------------------------------------------------------------------------------
enum Expression { NEUTRAL, SMILE, WIDE_SMILE, SURPRISE, DETERMINED }
var current_expression: Expression = Expression.SMILE

# Natural Auto-Blink Controller
var blink_timer: float = 2.5
var is_blinking: bool = false
var blink_progress: float = 0.0 # 0.0 = open, 1.0 = fully closed
var double_blink_queued: bool = false

# Facial Morph Uniforms (Mapped to Face ShaderMaterial)
var eye_scale: float = 1.0
var eyebrow_offset: float = 0.0
var eyebrow_slant: float = 0.0
var blush_intensity: float = 0.5
var mouth_shape: int = 1 # 0: neutral, 1: smile, 2: wide_smile, 3: surprise_o, 4: determined

# ------------------------------------------------------------------------------
# 3. Secondary Spring-Damper Physics (Ponytail & Inertia)
# ------------------------------------------------------------------------------
var pony_angle_x: float = 0.0
var pony_angle_z: float = 0.0
var pony_vel_x: float = 0.0
var pony_vel_z: float = 0.0

const PONY_SPRING_K: float = 38.0
const PONY_DAMPING_C: float = 7.5

# Landing impact compression
var landing_squish: float = 0.0
var was_on_floor_last_frame: bool = true

func _ready() -> void:
	if character_gender == "girl" and hoodie_color == Color("#2563eb"):
		hoodie_color = Color("#f43f5e") # Default vibrant pink for Maya
	_setup_materials()

func _physics_process(delta: float) -> void:
	_update_blinking(delta)
	_update_expressions(delta)
	_update_secondary_physics(delta)
	_update_landing_impact(delta)
	_update_partner_look_at(delta)

# ------------------------------------------------------------------------------
# Natural Human-Like Blinking System
# ------------------------------------------------------------------------------
func _update_blinking(delta: float) -> void:
	blink_timer -= delta
	if blink_timer <= 0.0 and not is_blinking:
		is_blinking = true
		blink_progress = 0.0
		double_blink_queued = randf() < 0.25 # 25% chance of charming double-blink

	if is_blinking:
		blink_progress += delta / 0.13
		if blink_progress >= 1.0:
			blink_progress = 0.0
			is_blinking = false
			if double_blink_queued:
				double_blink_queued = false
				blink_timer = 0.08
			else:
				blink_timer = randf_range(2.5, 5.0)

	_apply_face_shader_params()

# ------------------------------------------------------------------------------
# Dynamic Facial Expression Transitions
# ------------------------------------------------------------------------------
func set_expression(expr: Expression) -> void:
	current_expression = expr
	match expr:
		Expression.SURPRISE:
			eye_scale = 1.18
			eyebrow_offset = 1.0
			eyebrow_slant = 0.5
			mouth_shape = 3 # surprise_o
			blush_intensity = 0.9
		Expression.WIDE_SMILE:
			eye_scale = 1.05
			eyebrow_offset = 0.3
			eyebrow_slant = 0.1
			mouth_shape = 2 # wide_smile
			blush_intensity = 0.85
		Expression.DETERMINED:
			eye_scale = 0.96
			eyebrow_offset = -0.3
			eyebrow_slant = -0.6
			mouth_shape = 4 # determined smirk
			blush_intensity = 0.4
		Expression.SMILE:
			eye_scale = 1.0
			eyebrow_offset = 0.1
			eyebrow_slant = 0.0
			mouth_shape = 1 # smile
			blush_intensity = 0.6
		Expression.NEUTRAL:
			eye_scale = 1.0
			eyebrow_offset = 0.0
			eyebrow_slant = 0.0
			mouth_shape = 0
			blush_intensity = 0.45

func _update_expressions(delta: float) -> void:
	var speed: float = Vector2(velocity.x, velocity.z).length()
	
	if not is_on_floor() or speed > 5.0:
		set_expression(Expression.DETERMINED)
	elif velocity.y < -5.0:
		set_expression(Expression.SURPRISE)
	else:
		set_expression(Expression.SMILE)

func trigger_event(event_name: String) -> void:
	match event_name:
		"jump":
			set_expression(Expression.SURPRISE)
			set_blend_shape("surprise", 0.85)
		"collect_item":
			set_expression(Expression.WIDE_SMILE)
			set_blend_shape("smile", 1.0)
		"checkpoint":
			set_expression(Expression.SMILE)
			set_blend_shape("smile", 0.85)
		"land":
			is_blinking = true
			blink_progress = 0.0
		"trap_near":
			set_expression(Expression.SURPRISE)
			set_blend_shape("surprise", 1.0)
		"victory":
			set_expression(Expression.WIDE_SMILE)
			set_blend_shape("smile", 1.0)

func set_blend_shape(shape_name: String, weight: float) -> void:
	if not face_mesh:
		return
	var idx = face_mesh.find_blend_shape_by_name(shape_name)
	if idx != -1:
		face_mesh.set_blend_shape_value(idx, clampf(weight, 0.0, 1.0))

func _apply_face_shader_params() -> void:
	if not face_mesh:
		return
	var mat: ShaderMaterial = face_mesh.get_surface_override_material(0) as ShaderMaterial
	if mat:
		var blink_val: float = sin(blink_progress * PI) if is_blinking else 0.0
		mat.set_shader_parameter("blink_amount", blink_val)
		mat.set_shader_parameter("eye_scale", eye_scale)
		mat.set_shader_parameter("eyebrow_offset", eyebrow_offset)
		mat.set_shader_parameter("eyebrow_slant", eyebrow_slant)
		mat.set_shader_parameter("mouth_shape", mouth_shape)
		mat.set_shader_parameter("blush_intensity", blush_intensity)

# ------------------------------------------------------------------------------
# Secondary Spring-Damper Physics for Ponytail
# ------------------------------------------------------------------------------
func _update_secondary_physics(delta: float) -> void:
	if not ponytail_bone or character_gender != "girl":
		return

	var speed_fwd: float = -transform.basis.z.dot(velocity)
	var speed_side: float = transform.basis.x.dot(velocity)

	var target_pony_x: float = -speed_fwd * 0.06 - (0.3 if velocity.y < -0.5 else -0.15)
	var target_pony_z: float = speed_side * 0.08

	var force_x: float = -PONY_SPRING_K * (pony_angle_x - target_pony_x) - PONY_DAMPING_C * pony_vel_x
	var force_z: float = -PONY_SPRING_K * (pony_angle_z - target_pony_z) - PONY_DAMPING_C * pony_vel_z

	pony_vel_x += force_x * delta
	pony_vel_z += force_z * delta
	pony_angle_x += pony_vel_x * delta
	pony_angle_z += pony_vel_z * delta

	ponytail_bone.rotation.x = clampf(pony_angle_x, -0.6, 0.9)
	ponytail_bone.rotation.z = clampf(pony_angle_z, -0.5, 0.5)

# ------------------------------------------------------------------------------
# Elastic Landing Impact Compression
# ------------------------------------------------------------------------------
func _update_landing_impact(delta: float) -> void:
	if not was_on_floor_last_frame and is_on_floor():
		landing_squish = 0.08 # Touchdown compression dip
	was_on_floor_last_frame = is_on_floor()

	if landing_squish > 0.001:
		landing_squish = lerpf(landing_squish, 0.0, 15.0 * delta)
	else:
		landing_squish = 0.0

	var hips_node: Node3D = skeleton.get_node_or_null("Bone_Hips")
	if hips_node:
		hips_node.position.y = 0.92 - landing_squish

# ------------------------------------------------------------------------------
# Partner Glance & Eye Contact System
# ------------------------------------------------------------------------------
func _update_partner_look_at(delta: float) -> void:
	if partner_path.is_empty():
		return
	var partner: Node3D = get_node_or_null(partner_path) as Node3D
	if not partner:
		return

	var head_node: Node3D = skeleton.get_node_or_null("Bone_Head")
	if head_node:
		var dir_to_partner: Vector3 = global_position.direction_to(partner.global_position)
		var local_dir: Vector3 = global_transform.basis.inverse() * dir_to_partner
		var target_yaw: float = clampf(atan2(local_dir.x, local_dir.z) * 0.45, -0.65, 0.65)
		head_node.rotation.y = lerp_angle(head_node.rotation.y, target_yaw, 6.0 * delta)

func _setup_materials() -> void:
	# Godot 4 PBR Subsurface Scattering (SSS) & Epidermal Skin Material Setup
	var skin_mat = StandardMaterial3D.new()
	skin_mat.albedo_color = skin_tone
	skin_mat.roughness = 0.52
	skin_mat.metallic = 0.0
	
	# Subsurface Scattering Configuration (Godot 4 Transmittance & SSS)
	skin_mat.subsurf_scatter_enabled = true
	skin_mat.subsurf_scatter_strength = 0.38
	skin_mat.subsurf_scatter_skin_mode = true
	skin_mat.subsurf_scatter_transmittance_color = Color(1.0, 0.42, 0.35)
	skin_mat.subsurf_scatter_transmittance_depth = 0.12
	
	# Clearcoat for Epidermal Lipid / Moisture Sheen
	skin_mat.clearcoat_enabled = true
	skin_mat.clearcoat = 0.28
	skin_mat.clearcoat_roughness = 0.22
	
	# Rim Lighting for Peach Fuzz Retro-Reflection
	skin_mat.rim_enabled = true
	skin_mat.rim = 0.45
	skin_mat.rim_tint = 0.55
	
	# Dedicated High-Transmittance Ear SSS Material (Soft light penetration through cartilage)
	var ear_mat = StandardMaterial3D.new()
	ear_mat.albedo_color = skin_tone
	ear_mat.roughness = 0.46
	ear_mat.metallic = 0.0
	ear_mat.subsurf_scatter_enabled = true
	ear_mat.subsurf_scatter_strength = 0.78
	ear_mat.subsurf_scatter_skin_mode = true
	ear_mat.subsurf_scatter_transmittance_color = Color(1.0, 0.28, 0.22)
	ear_mat.subsurf_scatter_transmittance_depth = 0.48
	ear_mat.clearcoat_enabled = true
	ear_mat.clearcoat = 0.32
	ear_mat.clearcoat_roughness = 0.20
	ear_mat.rim_enabled = true
	ear_mat.rim = 0.75
	ear_mat.rim_tint = 0.85

	# Assign to character meshes if present in hierarchy
	var head_mesh: MeshInstance3D = skeleton.get_node_or_null("Bone_Head/HeadMesh") as MeshInstance3D
	if head_mesh:
		head_mesh.set_surface_override_material(0, skin_mat)
	var neck_mesh: MeshInstance3D = skeleton.get_node_or_null("Bone_Neck/NeckMesh") as MeshInstance3D
	if neck_mesh:
		neck_mesh.set_surface_override_material(0, skin_mat)
	var left_ear_mesh: MeshInstance3D = skeleton.get_node_or_null("Bone_Head/LeftEarMesh") as MeshInstance3D
	if left_ear_mesh:
		left_ear_mesh.set_surface_override_material(0, ear_mat)
	var right_ear_mesh: MeshInstance3D = skeleton.get_node_or_null("Bone_Head/RightEarMesh") as MeshInstance3D
	if right_ear_mesh:
		right_ear_mesh.set_surface_override_material(0, ear_mat)

