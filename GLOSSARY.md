# Portfolio Context

Spatial 3D narrative portfolio experience for Paolo Maria Scarlata (ZGr3Y), showcasing Cloud Systems and Security Engineering through an interactive scrollytelling journey on a Light Gray canvas.

## Language

**Journey**:
The continuous narrative scrollytelling experience traversed across a single Three.js WebGL canvas from Act 0 through Act 5.
_Avoid_: Slideshow, carousel, page list

**Act**:
A distinct narrative chapter and thematic waypoint along the Journey timeline (Loader, Gateway, Pill Choice, Branch, Shatter, Transmission).
_Avoid_: Slide, view, sub-page

**Station**:
A 3D coordinate waypoint and visual focal point representing a logical stage of the narrative (Gateway, Experiences, Harness, Transmission).
_Avoid_: Page, screen, slide, view

**Pill Choice**:
The interactive branching mechanic in Act 2 presenting a human hand with procedural Blue Pill (Experiences) and a robotic hand with procedural Red Pill (Harness). Downward scroll is gated until a pill is chosen.
_Avoid_: Toggle, radio button, switcher

**Branch**:
One of the two divergent thematic paths selected during Pill Choice: the Blue Branch focusing on engineering projects (Experiences) or the Red Branch focusing on technical skills and tooling (Harness).
_Avoid_: Tab, route, alternative page

**Shatter**:
The procedural shard fracture effect in Act 4 where Rick's ship fly-through shatters the viewport before transitioning into the quiet Act 5 Transmission space.
_Avoid_: Page wipe, screen blast, glitch transition

**HUD**:
The persistent minimalist heads-up display floating over the 3D canvas that displays current station status and allows instant tier navigation.
_Avoid_: Navbar, header, menu

**Cloud Card**:
A soft elevated card on the light-gray canvas featuring subtle ambient shadows, crisp typography, and semantic primary color accents.
_Avoid_: Holographic panel, dark glass pane

**Idle Damping**:
The performance throttling system that steps down the GPU render loop when the camera is static and no pointer interaction is detected.
_Avoid_: Sleep, pause, freeze
