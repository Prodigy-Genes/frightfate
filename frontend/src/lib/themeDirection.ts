export interface ThemeDirection {
  homeHeadline: string;
  homeDeck: string;
  homeStamp: string;
  sceneCaption: string;
  roomTitle: string;
  roomSub: string;
  roomCodeLabel: string;
  roomRoster: string;
  roomWarning: string;
  roomStart: string;
  gameKicker: string;
  gameSub: string;
  gameProgress: string;
  gameClock: string;
  gameScene: string;
  answerKicker: string;
  answerHeading: string;
  answerLabel: string;
  answerNote: string;
  answerSubmit: string;
  analysisTitle: string;
  analysisHeading: string;
  analysisMetric: string;
  analysisTipHeading: string;
  analysisClosing: string;
  lostTopline: string;
  lostEyebrow: string;
  lostHeadline: string;
  lostSub: string;
  lostFooter: string;
  survivedEyebrow: string;
  survivedHeadline: string;
  survivedSub: string;
  resultsTitle: string;
  resultsSub: string;
  boardTitle: string;
  boardSub: string;
  boardIntro: string;
  boardFilterAll: string;
  analysisTips: string[];
  finaleLostCaption: string;
  finaleWonCaption: string;
}

export const THEME_DIRECTIONS: Record<string, ThemeDirection> = {
  haunted_house: {
    homeHeadline: "The house has\nbeen waiting.", homeDeck: "A place with no address. A host who knows your name. Three choices before the house keeps it.", homeStamp: "DO NOT ANSWER THE KNOCK", sceneCaption: "PLATE I / THE HOUSE THAT REMEMBERS",
    roomTitle: "The candlelit gathering", roomSub: "The walls are listening. Keep your voice low.", roomCodeLabel: "WHISPER THIS ROOM KEY", roomRoster: "Names in the ledger", roomWarning: "When the bell tolls, the house seals every exit.", roomStart: "Ring the Bell",
    gameKicker: "MANOR HOUSE / NIGHT 01", gameSub: "The corridor is longer than it was a moment ago.", gameProgress: "CHAPTER OF THE HOUSE", gameClock: "UNTIL THE NEXT BELL", gameScene: "HOUSE RECORD / DO NOT READ ALOUD",
    answerKicker: "CONFESSION, IN YOUR OWN HAND", answerHeading: "Choose what the house learns.", answerLabel: "How will you cross this room?", answerNote: "THE HOUSE HEARS HESITATION.", answerSubmit: "Speak into the Dark",
    analysisTitle: "The house considers your confession…", analysisHeading: "A verdict is forming in the walls.", analysisMetric: "Your candle is burning", analysisTipHeading: "A note from Madame Vesper", analysisClosing: "Something upstairs has heard enough.",
    lostTopline: "THE MANOR / ROOM SEALED", lostEyebrow: "THE LAST CANDLE GOES OUT", lostHeadline: "THE HOUSE KEEPS YOU.", lostSub: "Your name joins the others beneath the floorboards.", lostFooter: "THE BELL WILL RING AGAIN FOR SOMEONE ELSE.",
    survivedEyebrow: "DAWN / THE FRONT DOOR OPENS", survivedHeadline: "You left the house.\nIt remembers you.", survivedSub: "Behind you, every upstairs window lights at once.", resultsTitle: "The House's Ledger", resultsSub: "Madame Vesper has written the final names.", boardTitle: "The House Ledger", boardSub: "Names the house refused to forget.", boardIntro: "The manor records every guest. The longest stay is not always a victory.", boardFilterAll: "All Houses",
    analysisTips: ["A mirror shows the room behind you. Never the room you are in.", "If a portrait's eyes follow, do not test whether its mouth moves.", "The staircase adds one step every time you count it."], finaleLostCaption: "THE HOUSE HAS ADDED ANOTHER PORTRAIT", finaleWonCaption: "THE FRONT DOOR OPENS ONCE",
  },
  zombie_outbreak: {
    homeHeadline: "QUARANTINE\nIS FAILING.", homeDeck: "Sector Nine is breached. The elevators are dead. Your next three decisions are now part of the incident report.", homeStamp: "BIOHAZARD / LEVEL 4", sceneCaption: "INCIDENT 09 / EAST WING BREACH",
    roomTitle: "Quarantine staging area", roomSub: "Check your seals. Nobody leaves the roster uncounted.", roomCodeLabel: "ENCRYPTED CHANNEL KEY", roomRoster: "Survivors on this channel", roomWarning: "The breach clock is running. Sound carries through the vents.", roomStart: "Authorize Breach Protocol",
    gameKicker: "SECTOR 09 / CONTAINMENT LOST", gameSub: "Thermal contact moving through the service corridor.", gameProgress: "INCIDENT RESPONSE LOG", gameClock: "UNTIL CONTAINMENT FAILURE", gameScene: "BODYCAM FOOTAGE / FRAME RECOVERED",
    answerKicker: "OPERATOR ACTION / RECORD FOR REVIEW", answerHeading: "Issue your next command.", answerLabel: "What is your move, operator?", answerNote: "NOISE ATTRACTS CONTACT.", answerSubmit: "Transmit Command",
    analysisTitle: "Quarantine-9 is reviewing your response…", analysisHeading: "Tactical assessment in progress.", analysisMetric: "Containment integrity", analysisTipHeading: "Quarantine-9 protocol note", analysisClosing: "The situation is deteriorating. Remain useful.",
    lostTopline: "SECTOR 09 / OPERATOR SIGNAL LOST", lostEyebrow: "CONTAINMENT FAILURE", lostHeadline: "OPERATOR DOWN.", lostSub: "Your badge is recovered. Your status is not.", lostFooter: "THIS INCIDENT REPORT WILL BE SEALED.",
    survivedEyebrow: "EVACUATION / ONE SIGNAL REMAINS", survivedHeadline: "You made\nthe extraction.", survivedSub: "Do not remove your mask until the green light.", resultsTitle: "The Incident Report", resultsSub: "Quarantine-9 has filed the response outcomes.", boardTitle: "Survivor Registry", boardSub: "Names verified against the evacuation manifest.", boardIntro: "Response teams are ranked by decisions, time, and who made it through the cordon.", boardFilterAll: "All Sectors",
    analysisTips: ["Movement detected above the ceiling grid. Do not look up.", "A red door is not a safe room. It is a warning label.", "If the radio says your call sign twice, answer once."], finaleLostCaption: "BODYCAM 04 / TRANSMISSION TERMINATED", finaleWonCaption: "EVACUATION VEHICLE / ONE SEAT LEFT",
  },
  slasher_movie: {
    homeHeadline: "Last night\nat Camp Crystal.", homeDeck: "The reel is damaged. The killer is not. Make three decisions before the final cut finds you.", homeStamp: "SIDE A / DO NOT SPLIT UP", sceneCaption: "FRAME 13 / CAMP CRYSTAL PINES",
    roomTitle: "The last campfire", roomSub: "Keep the headlights on. Nobody walks to the lake alone.", roomCodeLabel: "PASS THIS TAPE TO THE GROUP", roomRoster: "Still around the fire", roomWarning: "The music has stopped. That means the scene has started.", roomStart: "Roll Camera",
    gameKicker: "CAMP CRYSTAL / FINAL REEL", gameSub: "A shape between the pines. The camera refuses to focus.", gameProgress: "SCENE / TAKE / SURVIVOR", gameClock: "UNTIL THE CUT", gameScene: "FOUND FOOTAGE / AUDIO DISTORTED",
    answerKicker: "YOUR FINAL SCENE", answerHeading: "What do you do before the cut?", answerLabel: "Write the next beat of the scene.", answerNote: "NEVER SAY “I'LL BE RIGHT BACK.”", answerSubmit: "Keep Rolling",
    analysisTitle: "The projector stutters over your decision…", analysisHeading: "The audience knows what happens next.", analysisMetric: "Final girl / final frame", analysisTipHeading: "A note from the projection booth", analysisClosing: "Do not look behind you while the credits roll.",
    lostTopline: "REEL 06 / IMAGE LOST TO STATIC", lostEyebrow: "THE FINAL CUT", lostHeadline: "You didn't\nmake the reel.", lostSub: "The camera keeps recording after everyone leaves.", lostFooter: "THE TAPE WILL BE FOUND IN THE SPRING.",
    survivedEyebrow: "SUNRISE / CUT TO BLACK", survivedHeadline: "You are the\nfinal frame.", survivedSub: "The lake is still. Your reflection is not.", resultsTitle: "Final Cut / Cast & Crew", resultsSub: "The reel has decided who gets top billing.", boardTitle: "The Final Cut", boardSub: "A cast list with fewer names each year.", boardIntro: "The credits roll in survival order. The director takes no questions.", boardFilterAll: "All Reels",
    analysisTips: ["The killer is never in the shot until the camera pans away.", "A running car is not a plan until the keys are in your hand.", "If the soundtrack drops out, stop moving."], finaleLostCaption: "END OF SIDE A / DO NOT REWIND", finaleWonCaption: "THE FINAL SHOT / HOLD FOR THREE SECONDS",
  },
  alien_invasion: {
    homeHeadline: "They answered\nour signal.", homeDeck: "The radar station has gone silent. Something learned the shape of our transmission. Do not answer it back.", homeStamp: "OUTPOST K / SIGNAL CONTAMINATED", sceneCaption: "RADAR CONTACT / ORIGIN UNKNOWN",
    roomTitle: "Outpost K / signal room", roomSub: "Your comms are open. Something else is on the channel.", roomCodeLabel: "ENCRYPTED FREQUENCY", roomRoster: "Crew biosigns detected", roomWarning: "Keep transmissions short. The echo is learning your voices.", roomStart: "Initiate First Contact",
    gameKicker: "ARCTIC OUTPOST K / CONTACT EVENT", gameSub: "The radar has found a second station. We only built one.", gameProgress: "CONTACT LOG / SEQUENCE", gameClock: "UNTIL SIGNAL LOCK", gameScene: "RADAR SCRUB / ENTITY UNRESOLVED",
    answerKicker: "FLIGHT RECORDER / CREW RESPONSE", answerHeading: "What do you tell the crew?", answerLabel: "Record your response to contact.", answerNote: "IT LEARNS FROM EVERY SIGNAL.", answerSubmit: "Send Response",
    analysisTitle: "The transmission is being translated…", analysisHeading: "Non-human pattern recognition active.", analysisMetric: "Signal integrity", analysisTipHeading: "A recovered note from Outpost K", analysisClosing: "The return signal is closer now.",
    lostTopline: "OUTPOST K / CREW BIOMETRICS FLATLINE", lostEyebrow: "CONTACT HAS BEEN ESTABLISHED", lostHeadline: "They learned\nyour shape.", lostSub: "The station reports one additional life sign.", lostFooter: "THE BEACON WILL CONTINUE TO TRANSMIT.",
    survivedEyebrow: "DISTRESS BEACON / HUMAN SIGNAL DETECTED", survivedHeadline: "You are\nnot the echo.", survivedSub: "Something follows your escape trajectory.", resultsTitle: "Contact Event / Crew Log", resultsSub: "The surviving signal has been isolated.", boardTitle: "Outpost K Crew Log", boardSub: "Biosigns cross-checked with the last transmission.", boardIntro: "Each record is an echo from a station that may never have existed.", boardFilterAll: "All Signals",
    analysisTips: ["The snow outside is falling upward. Do not mention it over comms.", "The voice on channel 3 has no delay. It is not coming from space.", "If the radar draws a perfect circle, shut it down."], finaleLostCaption: "RETURN SIGNAL / HUMAN ORIGIN UNCONFIRMED", finaleWonCaption: "THE BEACON IS STILL FOLLOWING YOU",
  },
  deep_sea_terror: {
    homeHeadline: "11,000 metres.\nOne way down.", homeDeck: "The trench station is losing pressure. The sonar keeps returning a reply from something below the map.", homeStamp: "DEPTH 10,984 M / HULL BREACH", sceneCaption: "BATHYAL ZONE / PRESSURE RISING",
    roomTitle: "The observation chamber", roomSub: "Watch the porthole. If it blinks, do not blink back.", roomCodeLabel: "SONAR PULSE / SHARED KEY", roomRoster: "Crew remaining at depth", roomWarning: "Every sealed hatch costs oxygen. The station is already counting.", roomStart: "Descend Below the Light",
    gameKicker: "HADAL STATION / DEPTH 10,984 M", gameSub: "Hull strain is speaking in a voice the sonar recognizes.", gameProgress: "DESCENT LOG / PRESSURE CYCLE", gameClock: "OXYGEN RESERVE", gameScene: "PORTHOLE FEED / EXTERNAL LIGHT SOURCE",
    answerKicker: "DIVE LOG / LAST BREATH RECORDED", answerHeading: "Choose what you seal away.", answerLabel: "What is your next move below?", answerNote: "AIR IS A FINITE RESOURCE.", answerSubmit: "Log Dive Decision",
    analysisTitle: "HADAL-STATION is calculating the pressure…", analysisHeading: "An answer is returning from below.", analysisMetric: "Remaining oxygen", analysisTipHeading: "HADAL-STATION maintenance note", analysisClosing: "Sonar contact is now inside the hull.",
    lostTopline: "HADAL STATION / DESCENT LOG TERMINATED", lostEyebrow: "PRESSURE EQUALIZED", lostHeadline: "The abyss\nhas your number.", lostSub: "Something has taken your place at the observation glass.", lostFooter: "NO RECOVERY CANISTER WILL BE DISPATCHED.",
    survivedEyebrow: "SURFACE / AIR AGAINST ALL PROBABILITY", survivedHeadline: "You reached\nthe surface.", survivedSub: "The buoy is transmitting from beneath your boat.", resultsTitle: "HADAL-STATION / Descent Record", resultsSub: "The pressure has selected its remaining crew.", boardTitle: "The Descent Registry", boardSub: "Names recovered from the black box.", boardIntro: "Ranked by depth survived. The station has not confirmed any rescue.", boardFilterAll: "All Depths",
    analysisTips: ["A porthole that flexes inward is not a window. It is a membrane.", "The spare oxygen tank is warm. The others are cold.", "If the sonar shows a surface above you, stop descending."], finaleLostCaption: "BLACK BOX / LAST PRESSURE READING: IMPOSSIBLE", finaleWonCaption: "SURFACE LIGHT / SECOND SHADOW BELOW",
  },
  cryptid_woods: {
    homeHeadline: "The woods know\nyour voice.", homeDeck: "Old Mare's hollow has one trail out. Something in the trees has been practising your call for help.", homeStamp: "HOLLOW COUNTY / TRAIL 0", sceneCaption: "OLD MARE'S MAP / THE TRAIL THAT MOVES",
    roomTitle: "Old Mare's fire ring", roomSub: "Stay where the fire reaches. Count every voice twice.", roomCodeLabel: "PASS THE HOLLOW SIGN", roomRoster: "Voices around the fire", roomWarning: "If you hear your name from the tree line, do not answer.", roomStart: "Step Beyond the Firelight",
    gameKicker: "APPALACHIAN HOLLOW / TRAIL UNKNOWN", gameSub: "A familiar voice is calling from the wrong direction.", gameProgress: "TRAIL MARKS / NIGHT WALK", gameClock: "UNTIL THE CREEK RUNS DRY", gameScene: "OLD MARE'S FIELD NOTES / LISTEN FIRST",
    answerKicker: "WRITE IT DOWN / DO NOT SAY IT", answerHeading: "Choose which way the story turns.", answerLabel: "How do you cross the hollow?", answerNote: "IT LEARNS ONE WORD EACH TIME.", answerSubmit: "Leave a Field Note",
    analysisTitle: "Old Mare is listening between your words…", analysisHeading: "The hollow answers in your handwriting.", analysisMetric: "Distance to running water", analysisTipHeading: "Old Mare's pocket advice", analysisClosing: "Something just repeated your last sentence.",
    lostTopline: "HOLLOW COUNTY / YOUR VOICE FOUND", lostEyebrow: "THE SECOND CALL WAS YOURS", lostHeadline: "The woods\nkeep the name.", lostSub: "At dawn, your voice asks the search party to come closer.", lostFooter: "OLD MARE SAYS THE CREEK WILL RUN AGAIN TOMORROW.",
    survivedEyebrow: "DAWN / WATER BETWEEN YOU AND IT", survivedHeadline: "You found\nthe running water.", survivedSub: "From the far bank, something calls in your voice.", resultsTitle: "Old Mare's Hollow Book", resultsSub: "Every name is written twice. Just in case.", boardTitle: "The Hollow Book", boardSub: "A family record with several handwriting styles.", boardIntro: "Old Mare records who walked out. She does not say who walked back.", boardFilterAll: "All Hollows",
    analysisTips: ["If the whippoorwill calls at noon, stay beside running water.", "The iron nail is warm. It has been warm since you arrived.", "Never follow your own footprints back to camp."], finaleLostCaption: "OLD MARE'S BOOK / THE INK IS STILL WET", finaleWonCaption: "THE CREEK / A VOICE ON THE OTHER BANK",
  },
};

export function getThemeDirection(id?: string): ThemeDirection {
  return THEME_DIRECTIONS[id || "haunted_house"] || THEME_DIRECTIONS.haunted_house;
}
