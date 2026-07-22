"""Deprecated VSE role cleanup rules.

These lists are based on the June 2026 role usage audit. Deprecated roles are
not shown as active choices and rare deprecated roles are normalized to unknown.
"""

UNUSED_ROLES = frozenset({
    "construction_aux",
    "contour_cut",
    "contour_fold",
    "fill_fur",
    "fill_gradient",
    "fill_pink_dark",
    "fill_pink_light",
    "fill_shadow",
    "guide_line",
    "hw_snap",
    "line_photo_trace",
    "line_reference",
    "seam_allowance",
    "stitch_C",
    "stitch_F",
    "stitch_L",
    "stitch_O",
    "stitch_cover",
    "stitch_double",
    "stitch_hidden",
    "stitch_overlock",
    "stitch_topstitch",
    "stitch_zigzag",
})

RARE_ROLES_TO_UNKNOWN = frozenset({
    "_skip",
    "boundary_lining",
    "boundary_zone",
    "dim_line",
    "fill_binding",
    "hw_buckle_fill",
    "hw_button",
    "hw_buttonhole",
    "hw_other",
    "hw_zipper_tape_edge",
    "line_decorative",
    "line_mesh",
    "line_velcro",
})

REMOVED_ROLES = UNUSED_ROLES | RARE_ROLES_TO_UNKNOWN


def normalize_active_role(role):
    """Return the active replacement for a possibly deprecated role."""
    if role in RARE_ROLES_TO_UNKNOWN:
        return "unknown"
    if role in UNUSED_ROLES:
        return "unknown"
    return role
