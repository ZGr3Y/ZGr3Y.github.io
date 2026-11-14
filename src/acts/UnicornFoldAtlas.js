/** Hand-authored paper panels defining the sculpted unicorn relief.
 * X/Y are image coordinates; Z is depth in the scene. No photograph is used
 * as a color map. Faces are clipped to the original contour by the rig.
 * These are scenic paper panels, not a certified physical crease pattern.
 */
export const UNICORN_FOLD_PANELS = [
  // Head: triangular upper ridge, cheek, under-jaw and the folded poll.
  { id: 'head-crown', points: [[431,224,.03],[459,211,.02],[504,221,.04],[538,241,.04],[500,233,.24],[450,230,.28]] },
  { id: 'head-cheek', points: [[450,230,.28],[500,233,.24],[539,247,.015],[478,264,.035],[438,258,.33]] },
  { id: 'head-throat', points: [[438,258,.33],[478,264,.035],[466,274,.015],[411,275,.30]] },
  { id: 'head-poll', points: [[431,224,.03],[450,230,.28],[438,258,.33],[411,275,.30],[391,266,.015]] },

  // The long neck is a folded prism, with an actual longitudinal ridge.
  { id: 'neck-left-wall', points: [[391,266,.015],[411,275,.30],[407,311,.33],[425,384,.39],[405,373,.015],[385,309,.005]] },
  { id: 'neck-front-upper', points: [[411,275,.30],[466,274,.015],[479,327,.035],[407,311,.33]] },
  { id: 'neck-front-lower', points: [[407,311,.33],[479,327,.035],[494,391,.025],[425,404,.39],[425,384,.39]] },
  { id: 'neck-right-fold', points: [[466,274,.015],[474,272,-.025],[501,396,-.02],[494,408,.035],[494,391,.025],[479,327,.035]] },

  // Rear body: narrow folded spine and a broad, clean flank.
  { id: 'back-spine', points: [[192,437,.005],[327,426,.015],[329,458,.32],[210,453,.30]] },
  { id: 'back-flank-upper', points: [[210,453,.30],[329,458,.32],[317,507,.38]] },
  { id: 'back-flank-lower', points: [[210,453,.30],[317,507,.38],[315,529,.17],[221,539,.13]] },
  { id: 'back-lower-hem', points: [[221,539,.13],[315,529,.17],[316,541,.025],[226,553,.025],[213,541,.025]] },
  { id: 'hip-outer-fold', points: [[327,426,.015],[333,411,.025],[349,418,.16],[350,465,.12],[350,534,.02],[315,529,.17],[329,458,.32]] },
  { id: 'hip-raised-lapel', points: [[333,411,.025],[348,410,.025],[363,447,.29],[342,474,.34],[329,458,.32]] },

  // Tail: a ridge and two sides, rather than a flat triangle.
  { id: 'tail-upper', points: [[49,581,.002],[193,437,.005],[210,453,.30],[155,504,.23]] },
  { id: 'tail-lower', points: [[49,581,.002],[155,504,.23],[210,453,.30],[211,535,.035],[180,540,.015]] },
  { id: 'tail-return', points: [[49,581,.002],[180,540,.015],[211,535,.035],[191,524,.11],[148,533,.13]] },

  // Rear leg: two broad facets sharing a straight central crease.
  { id: 'rear-leg-left', points: [[216,542,.13],[266,551,.28],[240,685,.002],[232,637,.012]] },
  { id: 'rear-leg-right', points: [[266,551,.28],[317,539,.10],[240,685,.002]] },
  { id: 'rear-leg-edge', points: [[216,542,.13],[232,637,.012],[240,685,.002],[229,620,-.015],[219,558,-.015]] },

  // The narrow bridge between both halves remains part of the two sheets.
  { id: 'waist-upper', points: [[342,453,.30],[380,431,.36],[401,485,.39],[350,498,.18],[315,529,.17]] },
  { id: 'waist-lower', points: [[315,529,.17],[350,498,.18],[401,485,.39],[425,550,.14],[350,534,.02]] },

  // Collar opening: separate inner wall and turned-over rim around the neck.
  { id: 'collar-left-back', points: [[373,381,.005],[395,376,.005],[413,412,.25],[371,411,.24]] },
  { id: 'collar-left-return', points: [[371,411,.24],[413,412,.25],[402,431,.43],[378,428,.45]] },
  { id: 'collar-dark-pocket', shade: 'inner', points: [[395,376,.005],[425,384,.39],[425,404,.39],[411,424,.22],[390,413,.12]] },
  { id: 'collar-right', points: [[494,391,.025],[513,409,.005],[501,436,.36],[478,431,.38]] },

  // Chest: an open box with a folded apron and a continuous lower hem.
  { id: 'chest-left-wall', points: [[363,419,.10],[378,428,.45],[382,441,.51],[373,487,.51],[350,495,.12]] },
  { id: 'chest-top-lip', points: [[378,428,.45],[413,412,.25],[478,431,.38],[501,436,.36],[488,445,.44],[382,441,.51]] },
  { id: 'chest-apron', points: [[382,441,.51],[488,445,.44],[465,510,.43],[373,487,.51]] },
  { id: 'chest-right-wall', points: [[513,409,.005],[506,464,.015],[493,491,.015],[465,510,.43],[488,445,.44],[501,436,.36]] },
  { id: 'chest-bottom-hem', points: [[350,495,.12],[373,487,.51],[465,510,.43],[463,522,.13],[385,509,.12]] },
  { id: 'chest-right-return', points: [[465,510,.43],[493,491,.015],[481,528,.035],[463,522,.13]] },

  // Forward leg: a wide blade with a raised diagonal spine and turned edge.
  { id: 'front-leg-upper', points: [[499,490,.01],[646,632,.002],[524,563,.25],[471,533,.25]] },
  { id: 'front-leg-lower', points: [[425,550,.14],[471,533,.25],[524,563,.25],[646,632,.002],[450,559,.015]] },
  { id: 'front-leg-hem', points: [[425,550,.14],[450,559,.015],[646,632,.002],[494,576,-.012]] },
];
