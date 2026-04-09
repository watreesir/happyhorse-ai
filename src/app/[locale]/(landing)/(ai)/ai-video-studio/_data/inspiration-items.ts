import { VideoStudioI2VMode, VideoStudioMode } from '@/shared/lib/video-studio-workflow';

export type InspirationItem = {
  id: string;
  videoUrl: string;
  /** CSS aspect-ratio value, e.g. '16 / 9' or '9 / 16' */
  aspectRatio: string;
  mode: VideoStudioMode;
  prompt: string;
  /** Defaults to 'first-frame' when mode is 'image-to-video' */
  i2vMode?: VideoStudioI2VMode;
  /** Public image URL to pre-fill when mode is 'image-to-video' */
  imageUrl?: string;
};

export const INSPIRATION_ITEMS: InspirationItem[] = [
  {
    id: 'ins-01',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/metro.MP4',
    aspectRatio: '16 / 9',
    mode: 'text-to-video',
    prompt:
      "FORMAT: 15s / free rhythm / ONE CONTINUOUS SHOT / worm's eye rear follow, loopable\n\nSUBJECTS: A 10cm commuter in an office suit fights through a packed Seoul Metro carriage, trying to stay ahead of shifting feet and reach a narrow lane before it closes again. Full-size Seoul passengers stand packed shoulder to shoulder in the aisle, filling the car from bench to bench, with a mix of students, office workers, and everyday commuters in varied attire.\nENVIRONMENT: A clean Seoul Metro carriage with bright Hangul route displays, polished steel poles, pale floor panels, phone straps, canvas totes, backpacks, and cool window reflections. Crisp fluorescent carriage light mixes with soft tunnel flicker, turning shoe edges, swinging hems, and dangling bags into precise moving obstacles.\nMOOD: Tight, fast, and controlled, driven by crowd rhythm, polite compression, and constant foot readjustment.\nCOLOR LOGIC: Naturalistic Film Print Emulation\n\nSCENE:\nThe camera stays in one uninterrupted worm's eye rear follow at ankle height with a stable 24mm spherical feel, trailing the tiny commuter through a Seoul Metro aisle packed with students, office workers, and late riders who keep subtly changing stance as the train glides and sways. White sneakers shuffle inward, dark loafers pivot to make room near the pole, a pair of neat heels resets beside the bench, and hanging tote straps sway overhead as the commuter runs a floor seam, cuts left from a descending shoe, then darts right under a swinging garment hem. A seated passenger's shoe slides forward with the motion of the carriage, and the commuter steps onto the top of the foot, runs across the toes as they flex, drops off the front edge, and slips through the closing gap between a polished loafer and a sneaker sole. The crowd compresses again, forcing several passengers to widen their stance, drag one foot half a step, and replant for balance while Hangul station text and route lights reflect across the windows. The commuter skids, catches a seat support, springs up, jerks aside from a heel landing where the head was a moment earlier, then bursts into a narrow lane between crossed calves and shifting shoes. The final image loops by returning to the same tight corridor geometry, with the tiny figure still sprinting along the floor seam as carriage hum, shoe scrape, and the soft Seoul door chime pattern circle back into the opening rhythm.\n\nSFX: (train hum, sneaker squeak, leather creak, fabric rustle, soft heel taps, bag buckle click, polite door chime, carriage drone).",
  },
  {
    id: 'ins-02',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/moon.mp4',
    aspectRatio: '16 / 9',
    mode: 'text-to-video',
    prompt:
      "Open on a majestic lunar landscape under black sky, silver dust exploding under the hooves of a lone white horse galloping across crater edges. Earth looms gigantic above the horizon, blue and fragile. The camera races beside the horse, matching its speed, then swings ahead and backward in one fluid motion, revealing a hooded rider clutching something bright against their chest. The pursuit intensifies — behind them, distant headlights appear, bouncing over the crater field like hunters closing in. The camera rises high to show the horse crossing impossible terrain, then dives again as the rider approaches a cliff edge where the moon's surface drops into darkness. With nowhere left to run, the rider stands in the stirrups and hurls the glowing object skyward. The camera follows it up through silent lunar night — and the reveal hits: the moon, horse, hunters, everything is part of an elaborate carousel in an abandoned amusement park.",
  },
  {
    id: 'ins-03',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/sea.MP4',
    aspectRatio: '16 / 9',
    mode: 'text-to-video',
    prompt:
      'A lone man struggles to steady himself on a small boat in the middle of a violent ocean storm. Thunder cracks and heavy rain lashes down as towering waves crash around him. Suddenly, a sea monster bursts from the dark water, its massive jaws opening wide. It clamps its teeth onto the boat, splintering the wood, and violently drags it beneath the churning ocean as the man fights for his life. Dramatic lighting, cinematic camera angles, hyper-realistic, intense atmosphere.',
  },
  {
    id: 'ins-04',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/dAPkgPVUFaFvX6-s.mp4',
    aspectRatio: '9 / 16',
    mode: 'text-to-video',
    prompt:
      'SINGLE TAKE. Helmet cam, slightly crooked. Auto-exposure hunting. Raw EVA footage.\n\nAUDIO: Breathing. Boots crunching regolith. Suit servos. Radio with slight delay.\n\n0-4s: POV of an astronaut in a white EVA suit hiking up a long crater ridge. Each step kicks dust that rises knee-high and hangs. The landscape is gray-brown regolith in every direction, lit by harsh flat sunlight. Nothing but rock and shadow and black sky. The astronaut is breathing steadily, rhythmic, like a mountain climber. Houston, routine: "You\'re 20 meters from the rim."\n4-8s: The astronaut crests the ridge. Stops dead. The POV rises slowly. Beyond the rim, the terrain drops away into a vast basin stretching to the curved horizon. And there, hanging alone in the black, is Earth. No frame of reference. No sense of scale. Just a tiny fragile disc of color in an ocean of black. The astronaut doesn\'t move. Breathing stops for a full beat.\n8-12s: Silence. Then a sound nobody expected. The astronaut starts laughing. Not a chuckle. Full, uncontrollable, joyful laughter that fogs the visor edges. Can\'t stop. Houston, confused: "Everything okay up there?" The astronaut, between laughs, barely getting words out: "I\'m fine. I\'m so fine. It\'s just... it\'s so small. Everything we\'ve ever known and it\'s so small."\n12-15s: The laughter fades to a long exhale. The astronaut sits down on the ridge, legs dangling over the slope like a kid on a dock. White boots hanging over gray dust. That tiny blue dot hanging far away in the black. One glove waves at it, small and silly. Astronaut, still smiling, you can hear it: "Hi, everyone." Hold.\n\nEVA helmet footage. Auto-exposure shift. No grade.',
  },
  {
    id: 'ins-05',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/eCqo_T9aUnZuPQsF.mp4',
    aspectRatio: '16 / 9',
    mode: 'text-to-video',
    prompt:
      "The Storm Shepherd vs the Glass Locust King\nA cinematic weather war. A nomadic shepherd in layered sky-blue robes stands on a high desert ridge during a sandstorm. He fights using a hooked crook, wind channels, and charged storm clouds. His enemy is a king locust made of translucent chitin, lightning veins, and a swarm-crown of crystal insects. The setting transitions from dune ridge → storm trench → lightning plateau → salt crater.\n\n0–3 seconds: the locust king descends out of the storm with a shrieking crown of glass-winged insects. The shepherd drives his crook into the sand and pulls a vortex of wind upward, forcing the first wave of insects into a spiraling wall. Close-ups of cracked lips, cloth snapping, glass wings, and charged dust.\n\n3–7 seconds: the locust king splinters into swarming formations that attack from every direction across a trench carved by wind. The shepherd walks into the storm, redirecting gusts with broad arm sweeps. Each movement creates visible wind corridors that slam the swarm into rock spires. Sand peels off the ground in ribbons. Close-ups of sandals sliding, storm static along the crook, chitin fractures, and lightning flicker under skin.\n\n7–10 seconds: the battle climbs onto a lightning plateau. The locust king towers above him with a giant fan of translucent wings reflecting the whole storm. The shepherd raises both hands and pulls a fork of lightning out of the sky like a rope, then whips it in a massive arc that shears off half the swarm crown. Orbit camera, desert lightning, flying crystal limbs.\n\n10–12 seconds: rapid tracking shot as the shepherd runs across a collapsing salt shelf while the king reforms and dives with all wings screaming. He hooks the crook into its thorax and drags it downward into a charged crater.\n\n12–15 seconds: overhead slow fall into the salt crater as storm winds spiral inward. The shepherd lands first while the locust king breaks apart into rain, glass fragments, and dead static that spiderwebs through the salt. Final frame: one intact locust wing ringing in the wind.\n\nStyle: epic storm fantasy, desert electricity, glass insect textures, sand and lightning choreography, high-contrast sky warfare.",
  },
  {
    id: 'ins-06',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/f584f6ee91c252ed77d132273413a616f96555ba.MP4',
    aspectRatio: '16 / 9',
    mode: 'text-to-video',
    prompt:
      "VERTICAL CITY — São Paulo Parkour at Sunset A teenage girl, 17, athletic, black curly hair flying free, wearing faded yellow shorts and a white tank top with scuffed trainers, runs full speed across the rooftops of São Paulo's dense favela skyline as the sun sets blood orange behind the city.\n[0s–1.5s] Wide panoramic shot of São Paulo at sunset. Endless concrete towers stacked like blocks. Camera finds one figure running across a rooftop, tiny against the city.\n[1.5s–3s] Close tracking shot behind her. She sprints across corrugated metal roofing, each step thundering, laundry lines whipping past her face. She leaps a gap between buildings without slowing.\n[3s–5s] She slides under a water tank, rolls, and immediately vaults over a wall onto a lower rooftop. Camera from below captures her silhouette against the orange sky mid vault.\n[5s–7s] She runs along a narrow concrete ledge, 15 stories up. The street far below is alive with traffic and lights. Her foot clips the edge and a piece of concrete falls, but she doesn't stop.\n[7s–9s] A massive gap between buildings. She builds speed, hits the roof edge, and launches. Time slows. Camera orbits her mid flight, the entire city visible behind her, sun touching the horizon.\n[9s–11s] She catches a fire escape railing on the opposite building. Momentum swings her through the structure. She uses the swing to launch upward, grabbing the next floor's railing.\n[11s–13s] She climbs hand over hand up the exterior of a high rise, using window frames and AC units. Below her, the city transitions from sunset orange to electric nightlife purple.\n[13s–15s] She reaches the top. Stands on the edge. Arms out. The entire city sprawls below her in every direction, lights flickering on like stars being born. Wind ripples her shirt. Cut to black.\nSão Paulo favela rooftops, sunset parkour, silhouette jumps, vertical city, golden hour to nightfall transition, cinematic tracking, 4K.",
  },
  {
    id: 'ins-07',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/%5Bsavetwt.com%5D%20Emily%20-%202041690826992918954%20-%201280x720.mp4',
    aspectRatio: '16 / 9',
    mode: 'text-to-video',
    prompt:
      "15-second cinematic romance, slow-burn emotional tone, one man and one woman only, both adults in their mid-20s, western-style leads, casual luxury wardrobe, dark quiet apartment living room at night, refined romantic tension, natural lip sync, no subtitles, no text on screen.\n\nCharacter continuity:\nFemale lead: adult western woman, mid-20s, elegant natural beauty, long brunette hair with soft loose waves, minimal makeup, emotionally guarded but faintly amused, seated on the sofa. Outfit: soft ivory off-shoulder knit sweater, dark straight-leg jeans, barefoot, understated jewelry.\nMale lead: adult western man, mid-20s, handsome refined features, slightly messy dark hair, thin metal-frame glasses, calm warm expression. Outfit: charcoal knit sweater over a white T-shirt, dark trousers, sleeves pushed once, relaxed but polished.\n\nEnvironment:\nUpscale apartment living room, soft sofa, low coffee table, one warm lamp, deep evening shadows, muted neutral palette, intimate silence, shallow depth of field, premium film texture, modern romantic realism.\n\n0-3s:\nWide-to-medium slow push-in. She sits in one corner of the sofa with arms folded, looking away. He crosses the room and sits on the edge of the coffee table facing her, leaving a small respectful distance. Hold the silence and tension.\n\n3-6s:\nMedium close-up on the man. He studies her face, voice low, calm, almost smiling:\n\"I tried very hard to have an ordinary evening.\"\n\n6-9s:\nClose-up on the woman. She turns her eyes to him at last, cool but intrigued, with the faintest teasing edge:\n\"And how did that go?\"\n\n9-12s:\nClose-up on the man. He lets out a quiet breath, gaze steady. He reaches toward a loose strand near her cheek, stopping just before touching:\n\"Poorly. You were in all of it.\"\n\n12-15s:\nSide two-shot. She lightly catches his wrist before he pulls away, not rejecting him, only holding him there. A small unwilling smile appears:\n\"That is not helping me stay angry.\"\nHold on the shared gaze, the restrained smile, and the unresolved tenderness.\n\nMotion and style rules:\nSlow elegant camera movement, meaningful pauses, micro-expressions, lingering eye contact, almost-touch tension, realistic hand motion, restrained acting, no kneeling, no raised voices, no crying, no extra characters, no exaggerated gestures, no waxy skin, no stiff posing, premium romantic realism, emotionally charged final frame.",
  },
  {
    id: 'ins-08',
    videoUrl:
      'https://pub-c6aad452eb2347eaa4c21f700c027909.r2.dev/seahorse/inspiration/tweeload_82n0x5gm.mp4',
    aspectRatio: '9 / 16',
    mode: 'text-to-video',
    prompt:
      '5-second vertical emergency street incident, realistic cinematic documentary style, 9:16.\n\nReference binding:\n@ Image1 is the main subject and must remain the same adult young woman throughout the full video. Preserve her exact face, long straight dark-brown hair with center part, fair skin, soft oval face, defined eyeliner, glossy pale pink lips, multiple silver ear studs, and yellow one-shoulder knit top with a silver oval brooch. Do not age-shift her. Do not change hairstyle, outfit, or identity.\n\nScene:\ndaytime in Brooklyn, New York, neighborhood sidewalk outside a corner deli or small storefront, brick wall, brownstone-like street character, parked cars along the curb, lived-in local block energy, sudden public danger, raw neighborhood realism.\n\nCore action:\na large black bull with thick curved horns has @ Image1 pinned against the brick wall on the sidewalk. She is terrified, gripping both horns with both hands, struggling constantly to stop the bull from pressing into her. The bull pushes forward with believable force and jerks its head aggressively. Nearby locals gather fast, shouting, backing away, and trying to help. One man inches in from the side. Another person yells to call 911.\n\nAudio:\nrealistic Brooklyn street ambience, passing cars, distant siren, footsteps, neighborhood voices, frightened screams, bull snorting, urgent English crowd shouting, no music, no narration.\nThe woman cries: "Help! Please help!"\nBystanders shout: "Call 911!" "Yo, back up!" "Somebody help her!"\n\nShot timeline:\n0.0-3.5s: medium-wide handheld shot from across the sidewalk. The bull has @ Image1 pinned to the wall outside the storefront. She grips both horns, face locked in panic, yelling for help. Nearby pedestrians stop abruptly.\n3.5-7.0s: tight side-angle shot. The bull surges forward and tosses its head. She braces and struggles, elbows shaking, shoes dragging against the pavement as she fights to keep the horns away.\n7.0-11.0s: wider vertical shot reveals more of the Brooklyn block. People gather near parked cars and the storefront, some filming, some retreating. One bystander steps in but pulls back when the bull snaps toward him.\n11.0-15.0s: shaky close handheld climax. Her grip slips for a moment, then clamps down again. The bull snorts and presses harder. Two bystanders wave from the side to distract it while others scream for emergency help. End on unresolved danger.\n\nCamera:\nvertical bystander-phone footage, handheld, reactive reframing, slight panic zoom and imperfect centering, no impossible moves, no slow motion.\n\nVisual rules:\nrealistic anatomy, realistic bull movement, realistic neighborhood crowd behavior, authentic Brooklyn street mood, no comedy, no fantasy, no gore, no blood spray, no severe visible injury, no subtitles, no text overlay, no watermark, no duplicated people.',
  },
];
