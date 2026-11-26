/**
 * Static rules data for Tag & Tally. Everything here mirrors the SRD
 * (https://srd.tagandtally.quest, docs v0.1.74) and is referenced by the
 * data models, roll engine, and sheets.
 */
export const SYSTEM_ID = "tagandtally";

export const TAGANDTALLY = {};

/** Level 1-10 with names. DC is always 3 x level. */
TAGANDTALLY.levels = {
  1: "TAGANDTALLY.Level.Simple",
  2: "TAGANDTALLY.Level.Standard",
  3: "TAGANDTALLY.Level.Demanding",
  4: "TAGANDTALLY.Level.Difficult",
  5: "TAGANDTALLY.Level.Challenging",
  6: "TAGANDTALLY.Level.Intimidating",
  7: "TAGANDTALLY.Level.Formidable",
  8: "TAGANDTALLY.Level.Heroic",
  9: "TAGANDTALLY.Level.Immortal",
  10: "TAGANDTALLY.Level.Impossible"
};

TAGANDTALLY.dcForLevel = (level) => 3 * Math.clamp(Number(level) || 1, 1, 10);

/** Outcome bands, ordered worst to best. */
TAGANDTALLY.bands = {
  failAnd: { id: "failAnd", label: "TAGANDTALLY.Band.FailAnd", css: "fail-and", success: false },
  failBut: { id: "failBut", label: "TAGANDTALLY.Band.FailBut", css: "fail-but", success: false },
  successBut: { id: "successBut", label: "TAGANDTALLY.Band.SuccessBut", css: "success-but", success: true },
  success: { id: "success", label: "TAGANDTALLY.Band.Success", css: "success", success: true },
  successAnd: { id: "successAnd", label: "TAGANDTALLY.Band.SuccessAnd", css: "success-and", success: true }
};

/** Band name as written in the Sparks resolution tables. */
TAGANDTALLY.bandSparkNames = {
  failAnd: "Fail, and",
  failBut: "Fail, but",
  successBut: "Success, but",
  success: "Success",
  successAnd: "Success, and"
};

/** Max number of easing sources that count toward a task, by task level. */
TAGANDTALLY.taskThreshold = (level) => {
  level = Number(level) || 1;
  if (level <= 3) return 2;
  if (level <= 6) return 3;
  if (level <= 8) return 4;
  return 5;
};
TAGANDTALLY.maxGearAssets = 2;

TAGANDTALLY.tiers = {
  1: "TAGANDTALLY.Tier.Novice",
  2: "TAGANDTALLY.Tier.Skilled",
  3: "TAGANDTALLY.Tier.Expert",
  4: "TAGANDTALLY.Tier.Master"
};
TAGANDTALLY.talliesPerTier = 5;
TAGANDTALLY.maxTier = 4;

TAGANDTALLY.tagTypes = {
  descriptor: "TAGANDTALLY.TagType.Descriptor",
  species: "TAGANDTALLY.TagType.Species",
  type: "TAGANDTALLY.TagType.Type",
  specialty: "TAGANDTALLY.TagType.Specialty",
  skill: "TAGANDTALLY.TagType.Skill",
  background: "TAGANDTALLY.TagType.Background",
  trait: "TAGANDTALLY.TagType.Trait",
  occupation: "TAGANDTALLY.TagType.Occupation",
  experience: "TAGANDTALLY.TagType.Experience",
  flaw: "TAGANDTALLY.TagType.Flaw",
  reputation: "TAGANDTALLY.TagType.Reputation",
  condition: "TAGANDTALLY.TagType.Condition",
  scene: "TAGANDTALLY.TagType.Scene",
  other: "TAGANDTALLY.TagType.Other"
};

/** Tag types that are umbrella tags in the character sentence. */
TAGANDTALLY.umbrellaTagTypes = ["descriptor", "species", "type", "specialty"];
/** Tag types that are static (cannot gain tiers). */
TAGANDTALLY.staticTagTypes = ["background", "trait", "flaw", "experience", "scene", "condition"];
/** Tag types that normally hinder rather than ease. */
TAGANDTALLY.hinderingTagTypes = ["flaw", "condition"];

TAGANDTALLY.lifeStages = {
  childhood: "TAGANDTALLY.LifeStage.Childhood",
  adolescence: "TAGANDTALLY.LifeStage.Adolescence",
  youngAdult: "TAGANDTALLY.LifeStage.YoungAdult",
  adult: "TAGANDTALLY.LifeStage.Adult",
  elder: "TAGANDTALLY.LifeStage.Elder"
};

/** Wound tracks in order from mildest to worst. */
TAGANDTALLY.woundTracks = {
  strain: { label: "TAGANDTALLY.Wound.Strain", max: 5, severity: 1 },
  lingeringTrauma: { label: "TAGANDTALLY.Wound.LingeringTrauma", max: 3, severity: 2 },
  debilitatingInjury: { label: "TAGANDTALLY.Wound.DebilitatingInjury", max: 2, severity: 3 },
  lastingScar: { label: "TAGANDTALLY.Wound.LastingScar", max: 3, severity: 4 }
};
TAGANDTALLY.woundTrackOrder = ["strain", "lingeringTrauma", "debilitatingInjury", "lastingScar"];
TAGANDTALLY.severityLabels = {
  0: "TAGANDTALLY.Severity.Unscathed",
  1: "TAGANDTALLY.Severity.Strained",
  2: "TAGANDTALLY.Severity.Traumatized",
  3: "TAGANDTALLY.Severity.Injured",
  4: "TAGANDTALLY.Severity.Scarred",
  5: "TAGANDTALLY.Severity.Broken"
};
/** Combat resolution band -> wound track (null = unscathed). */
TAGANDTALLY.combatWound = {
  failAnd: "lastingScar",
  failBut: "debilitatingInjury",
  successBut: "lingeringTrauma",
  success: "strain",
  successAnd: null
};
/** Injury type names as the Sparks wound tables spell them. */
TAGANDTALLY.woundTrackSparkNames = {
  strain: "Strain",
  lingeringTrauma: "Lingering Trauma",
  debilitatingInjury: "Debilitating Injury",
  lastingScar: "Lasting Scar"
};

TAGANDTALLY.damageTypes = {
  physical: "TAGANDTALLY.Damage.Physical",
  psychic: "TAGANDTALLY.Damage.Psychic",
  elemental: "TAGANDTALLY.Damage.Elemental",
  necrotic: "TAGANDTALLY.Damage.Necrotic",
  radiant: "TAGANDTALLY.Damage.Radiant",
  shadow: "TAGANDTALLY.Damage.Shadow",
  chaos: "TAGANDTALLY.Damage.Chaos",
  toxic: "TAGANDTALLY.Damage.Toxic"
};

/** Combat phases in order, with the Sparks resolution id for each. */
TAGANDTALLY.combatPhases = [
  { id: "opening", label: "TAGANDTALLY.Combat.Opening", spark: "combat opening" },
  { id: "maneuver", label: "TAGANDTALLY.Combat.Maneuver", spark: "combat maneuver" },
  { id: "attack", label: "TAGANDTALLY.Combat.Attack", spark: "combat strike" },
  { id: "counter", label: "TAGANDTALLY.Combat.Counter", spark: "combat counter" },
  { id: "resolution", label: "TAGANDTALLY.Combat.Resolution", spark: "combat outcome" }
];
/** Which earlier phases feed their modifier into each phase. */
TAGANDTALLY.combatPhaseFeeds = {
  opening: [],
  maneuver: ["opening"],
  attack: ["maneuver"],
  counter: ["maneuver"],
  resolution: ["attack", "counter"]
};

/**
 * Modifier each phase's band passes to the phases it feeds (positive = ease).
 * Opening: Fail-and -2, Fail-but -1, Success-but +1 (and take a strain), Success +1, Success-and +2.
 * Maneuver: -1, 0, -1, 0, +1. Attack and Counter: -2, 0, -1, +1, +2.
 */
TAGANDTALLY.combatPhaseModifiers = {
  opening: { failAnd: -2, failBut: -1, successBut: 1, success: 1, successAnd: 2 },
  maneuver: { failAnd: -1, failBut: 0, successBut: -1, success: 0, successAnd: 1 },
  attack: { failAnd: -2, failBut: 0, successBut: -1, success: 1, successAnd: 2 },
  counter: { failAnd: -2, failBut: 0, successBut: -1, success: 1, successAnd: 2 },
  resolution: { failAnd: 0, failBut: 0, successBut: 0, success: 0, successAnd: 0 }
};

TAGANDTALLY.gearTypes = {
  weapon: "TAGANDTALLY.Gear.Weapon",
  armor: "TAGANDTALLY.Gear.Armor",
  item: "TAGANDTALLY.Gear.Item",
  consumable: "TAGANDTALLY.Gear.Consumable",
  container: "TAGANDTALLY.Gear.Container",
  resource: "TAGANDTALLY.Gear.Resource",
  trap: "TAGANDTALLY.Gear.Trap",
  kit: "TAGANDTALLY.Gear.Kit"
};
TAGANDTALLY.gearKinds = {
  functional: "TAGANDTALLY.GearKind.Functional",
  extraordinary: "TAGANDTALLY.GearKind.Extraordinary",
  ephemeral: "TAGANDTALLY.GearKind.Ephemeral"
};
TAGANDTALLY.gearLevels = {
  1: "TAGANDTALLY.GearLevel.1", 2: "TAGANDTALLY.GearLevel.2", 3: "TAGANDTALLY.GearLevel.3",
  4: "TAGANDTALLY.GearLevel.4", 5: "TAGANDTALLY.GearLevel.5", 6: "TAGANDTALLY.GearLevel.6",
  7: "TAGANDTALLY.GearLevel.7", 8: "TAGANDTALLY.GearLevel.8", 9: "TAGANDTALLY.GearLevel.9",
  10: "TAGANDTALLY.GearLevel.10"
};
TAGANDTALLY.armorClasses = {
  none: { label: "TAGANDTALLY.Armor.None", defense: 0, stealth: 0, carry: 0 },
  light: { label: "TAGANDTALLY.Armor.Light", defense: 1, stealth: 0, carry: 0 },
  medium: { label: "TAGANDTALLY.Armor.Medium", defense: 2, stealth: 1, carry: 0 },
  heavy: { label: "TAGANDTALLY.Armor.Heavy", defense: 3, stealth: 2, carry: 1 }
};
TAGANDTALLY.consumableModes = {
  singleUse: "TAGANDTALLY.Consumable.SingleUse",
  depletion: "TAGANDTALLY.Consumable.Depletion"
};
TAGANDTALLY.loadoutSlots = 10;
TAGANDTALLY.ephemeralCap = 5;

TAGANDTALLY.wealthLevels = {
  0: "TAGANDTALLY.Wealth.0", 1: "TAGANDTALLY.Wealth.1", 2: "TAGANDTALLY.Wealth.2",
  3: "TAGANDTALLY.Wealth.3", 4: "TAGANDTALLY.Wealth.4", 5: "TAGANDTALLY.Wealth.5",
  6: "TAGANDTALLY.Wealth.6"
};
TAGANDTALLY.costLevels = {
  0: "TAGANDTALLY.Cost.0", 1: "TAGANDTALLY.Cost.1", 2: "TAGANDTALLY.Cost.2",
  3: "TAGANDTALLY.Cost.3", 4: "TAGANDTALLY.Cost.4", 5: "TAGANDTALLY.Cost.5",
  6: "TAGANDTALLY.Cost.6"
};
/**
 * Optional coins mode (not in the SRD): coins are a tally toward the next Wealth level.
 * Climbing from Wealth w to w+1 costs 10^(w+1) coins; cashing out from w gives 10^w coins.
 * Item prices in coins follow the SRD cost table (each cost level is 10x the previous).
 */
TAGANDTALLY.coins = {
  climbCost: (wealth) => 10 ** (Math.clamp(wealth, 0, 5) + 1),
  cashOut: (wealth) => 10 ** Math.clamp(wealth, 1, 6),
  priceForCost: (cost) => (cost > 0 ? 10 ** cost : 0)
};

TAGANDTALLY.qualityOfLife = {
  "-1": "TAGANDTALLY.QoL.Above",
  "0": "TAGANDTALLY.QoL.At",
  "1": "TAGANDTALLY.QoL.Below"
};

/* ----------------------------- Spellcasting ----------------------------- */
TAGANDTALLY.spell = {
  bases: { Order: 1, Spirit: 2, Void: 3, Chaos: 4 },
  aspects: {
    Earth: 1, Air: 1, Water: 1, Death: 1, Illusion: 1,
    Fire: 2, Mind: 2, Light: 2, Sound: 2,
    Shadow: 3, Time: 3, Life: 3, Space: 3
  },
  types: { Damage: 2, Control: 3, Summon: 3, Ward: 2, Counter: 3 },
  additionalAxisCost: [1, 2, 5],
  maxAspects: 3,
  maxTypes: 3,
  /** SRD: "not more than 5 combined axis" (2 base + up to 3 additional). */
  maxCombinedAxes: 5,
  levelRanges: [
    { min: 4, max: 5, level: 1 }, { min: 6, max: 7, level: 2 }, { min: 8, max: 9, level: 3 },
    { min: 10, max: 11, level: 4 }, { min: 12, max: 13, level: 5 }, { min: 14, max: 15, level: 6 },
    { min: 16, max: 17, level: 7 }, { min: 18, max: 19, level: 8 }, { min: 20, max: 21, level: 9 },
    { min: 22, max: null, level: 10 }
  ],
  scopes: {
    minor: { label: "TAGANDTALLY.Spell.Scope.Minor", pm: 0 },
    small: { label: "TAGANDTALLY.Spell.Scope.Small", pm: 1 },
    medium: { label: "TAGANDTALLY.Spell.Scope.Medium", pm: 2 },
    large: { label: "TAGANDTALLY.Spell.Scope.Large", pm: 3 },
    extreme: { label: "TAGANDTALLY.Spell.Scope.Extreme", pm: 4 },
    world: { label: "TAGANDTALLY.Spell.Scope.World", pm: 5 }
  },
  /** Artifact: how the spell is produced. ease > 0 eases the cast, < 0 hinders. */
  artifacts: {
    ritual: { label: "TAGANDTALLY.Spell.Artifact.Ritual", ease: 2, maiAtCreation: true, canTrigger: true, mishap: false },
    encoded: { label: "TAGANDTALLY.Spell.Artifact.Encoded", ease: 1, maiAtCreation: true, canTrigger: true, mishap: true },
    channeled: { label: "TAGANDTALLY.Spell.Artifact.Channeled", ease: 0, maiAtCreation: false, canTrigger: false, mishap: true },
    manifestation: { label: "TAGANDTALLY.Spell.Artifact.Manifestation", ease: -1, maiAtCreation: false, canTrigger: false, mishap: true }
  },
  triggers: {
    none: { label: "TAGANDTALLY.Spell.Trigger.None", tm: 0 },
    minor: { label: "TAGANDTALLY.Spell.Trigger.Minor", tm: 1 },
    frequent: { label: "TAGANDTALLY.Spell.Trigger.Frequent", tm: 2 },
    always: { label: "TAGANDTALLY.Spell.Trigger.Always", tm: 3 }
  },
  bloodMagicEase: 2,
  /** MAI check hindrance by (spell level - MAI). */
  maiHindrance: (diff) => {
    if (diff < 0) return 0;
    if (diff <= 3) return 1;
    if (diff <= 6) return 2;
    return 3;
  }
};

TAGANDTALLY.questTallies = {
  plan: { label: "TAGANDTALLY.Quest.Plan", max: 5 },
  location: { label: "TAGANDTALLY.Quest.Location", max: 5 },
  countdown: { label: "TAGANDTALLY.Quest.Countdown", max: 10 }
};
TAGANDTALLY.questStatus = {
  active: "TAGANDTALLY.Quest.Active",
  completed: "TAGANDTALLY.Quest.Completed",
  failed: "TAGANDTALLY.Quest.Failed",
  abandoned: "TAGANDTALLY.Quest.Abandoned"
};

TAGANDTALLY.dispositions = {
  hostile: "TAGANDTALLY.Disposition.Hostile",
  unfriendly: "TAGANDTALLY.Disposition.Unfriendly",
  indifferent: "TAGANDTALLY.Disposition.Indifferent",
  friendly: "TAGANDTALLY.Disposition.Friendly",
  allied: "TAGANDTALLY.Disposition.Allied"
};

/**
 * SRD NPC-interaction ladder: permanent disposition and temporary attitude.
 * Stored as an index into this list (5 = Indifferent). `modifier` eases (+)
 * or hinders (-) social tasks; the SRD list is not monotonic on purpose.
 */
TAGANDTALLY.relationSteps = [
  { value: 0, modifier: -3, label: "TAGANDTALLY.Relation.Loathing" },
  { value: 1, modifier: -2, label: "TAGANDTALLY.Relation.Hostility" },
  { value: 2, modifier: -1, label: "TAGANDTALLY.Relation.Rivalry" },
  { value: 3, modifier: -1, label: "TAGANDTALLY.Relation.Conflict" },
  { value: 4, modifier: -1, label: "TAGANDTALLY.Relation.Irritated" },
  { value: 5, modifier: 0, label: "TAGANDTALLY.Relation.Indifferent" },
  { value: 6, modifier: 0, label: "TAGANDTALLY.Relation.Reliable" },
  { value: 7, modifier: 1, label: "TAGANDTALLY.Relation.Loyal" },
  { value: 8, modifier: 1, label: "TAGANDTALLY.Relation.EnduringTrust" },
  { value: 9, modifier: 2, label: "TAGANDTALLY.Relation.UnyieldingLoyalty" },
  { value: 10, modifier: 3, label: "TAGANDTALLY.Relation.UnbreakableBond" }
];
TAGANDTALLY.relationDefault = 5;
TAGANDTALLY.relationTallyMax = 5;
/** Relation lists on the character sheet and which documents feed them. */
TAGANDTALLY.relationKinds = {
  factions: { label: "TAGANDTALLY.Relations.Factions", icon: "fa-solid fa-flag", augurTypes: ["faction"] },
  people: { label: "TAGANDTALLY.Relations.People", icon: "fa-solid fa-user-group", augurTypes: ["npc", "person"] },
  places: { label: "TAGANDTALLY.Relations.Places", icon: "fa-solid fa-map-location-dot", augurTypes: ["location", "site", "ship"] }
};

TAGANDTALLY.sparkThemes = {
  fantasy: "TAGANDTALLY.Theme.Fantasy",
  modern: "TAGANDTALLY.Theme.Modern",
  "monster-hunter": "TAGANDTALLY.Theme.MonsterHunter"
};

TAGANDTALLY.insightsPerTally = 5;
/**
 * What players (and a veiled solo GM) learn about an NPC or creature only through play. The core
 * sentence (descriptor, species, type, specialty; disposition, descriptor, type for creatures) is
 * always visible. `insight` keys also fill through the five insight boxes.
 */
TAGANDTALLY.npcHidden = {
  npc: { keys: ["motivation", "quest", "attack", "damageType", "secret"], insight: ["secret"] },
  creature: { keys: ["motivation", "attack", "damageType", "specialAbility", "strength", "weakness"], insight: ["strength", "weakness"] }
};

/** SRD NPC interactions: Drift roll, pathways and outcome bands (text keys under TAGANDTALLY.Interaction). */
TAGANDTALLY.interaction = {
  drift: [
    { min: 2, max: 3, steps: -2 },
    { min: 4, max: 5, steps: -1 },
    { min: 6, max: 8, steps: 0 },
    { min: 9, max: 10, steps: 1 },
    { min: 11, max: 12, steps: 2 }
  ],
  pathways: {
    approach: ["offeringAid", "trade", "streetwise", "interrogation", "eavesdropping", "networking", "intimidation", "contracting", "restoration", "advisor"],
    approached: ["coldCall", "ambush", "debtCollector", "fan", "warning", "mistakenIdentity"]
  },
  outcomes: {
    approach: {
      failAnd: { label: "TAGANDTALLY.Band.FailAnd", text: "TAGANDTALLY.Interaction.Outcome.Approach.FailAnd", effect: "dispositionDown" },
      failBut: { label: "TAGANDTALLY.Band.FailBut", text: "TAGANDTALLY.Interaction.Outcome.Approach.FailBut", effect: "insight" },
      successBut: { label: "TAGANDTALLY.Band.SuccessBut", text: "TAGANDTALLY.Interaction.Outcome.Approach.SuccessBut", effect: "attitudeDown" },
      success: { label: "TAGANDTALLY.Band.Success", text: "TAGANDTALLY.Interaction.Outcome.Approach.Success", effect: null },
      successAnd: { label: "TAGANDTALLY.Band.SuccessAnd", text: "TAGANDTALLY.Interaction.Outcome.Approach.SuccessAnd", effect: "dispositionUp" }
    },
    approached: {
      failAnd: { label: "TAGANDTALLY.Band.FailAnd", text: "TAGANDTALLY.Interaction.Outcome.Approached.FailAnd", effect: null },
      failBut: { label: "TAGANDTALLY.Band.FailBut", text: "TAGANDTALLY.Interaction.Outcome.Approached.FailBut", effect: "insight" },
      successBut: { label: "TAGANDTALLY.Band.SuccessBut", text: "TAGANDTALLY.Interaction.Outcome.Approached.SuccessBut", effect: "attitudeDown" },
      success: { label: "TAGANDTALLY.Band.Success", text: "TAGANDTALLY.Interaction.Outcome.Approached.Success", effect: null },
      successAnd: { label: "TAGANDTALLY.Band.SuccessAnd", text: "TAGANDTALLY.Interaction.Outcome.Approached.SuccessAnd", effect: "dispositionUp" }
    }
  }
};

/* ------------------------------ Downtime -------------------------------- */
/**
 * SRD Downtime: 4 points a night, 1 point = 1 activity for 1 hour. `max` is
 * the hours the SRD allows per night; `effect` is handled in module/downtime.mjs.
 */
TAGANDTALLY.downtime = {
  points: 4,
  activities: {
    sleep: { icon: "fa-bed", max: 4, effect: "sleep" },
    research: { icon: "fa-magnifying-glass", max: 4, effect: "research", safeZone: true },
    study: { icon: "fa-book-open", max: 4, effect: "study", safeZone: true },
    workout: { icon: "fa-dumbbell", max: 4, effect: "workout" },
    meditation: { icon: "fa-spa", max: 1, effect: "dayTag", tag: "zen" },
    socializing: { icon: "fa-people-group", max: 4, effect: "socialize" },
    dinner: { icon: "fa-utensils", max: 1, effect: "dayTag", tag: "wellFed" },
    drinking: { icon: "fa-beer-mug-empty", max: 4, effect: "drinking" },
    gambling: { icon: "fa-dice", max: 4, effect: "gamble" },
    watch: { icon: "fa-eye", max: 4, effect: "watch", unsafeOnly: true },
    crafting: { icon: "fa-hammer", max: 4, effect: "workshop", tab: "craft", safeZone: true },
    repair: { icon: "fa-screwdriver-wrench", max: 4, effect: "workshop", tab: "augment", safeZone: true }
  },
  /** Gambling bets: chance of winning on 1d20 and the wealth tally change on win / loss. */
  bets: {
    number: { win: 2, loss: -1 },
    evenOdd: { win: 1, loss: -1 }
  },
  wealthTallyMax: 5
};

/**
 * Condition tags granted by downtime. Next-day tags last through the following
 * day; `tiered` ones stack a tier per hour (max 4).
 */
TAGANDTALLY.dayTags = {
  refreshed: { label: "TAGANDTALLY.DayTag.Refreshed", hinders: false, nextDay: true },
  zen: { label: "TAGANDTALLY.DayTag.Zen", hinders: false, nextDay: true },
  wellFed: { label: "TAGANDTALLY.DayTag.WellFed", hinders: false, nextDay: true },
  liquidCourage: { label: "TAGANDTALLY.DayTag.LiquidCourage", hinders: false, nextDay: true },
  exhausted: { label: "TAGANDTALLY.DayTag.Exhausted", hinders: true, nextDay: true, tiered: true },
  hangover: { label: "TAGANDTALLY.DayTag.Hangover", hinders: true, tiered: true },
  soreMuscles: { label: "TAGANDTALLY.DayTag.SoreMuscles", hinders: true, tiered: true }
};
TAGANDTALLY.dayTagMaxTier = 4;

/* -------------------------- Species & type builders ---------------------- */
TAGANDTALLY.builder = {
  /** Base MAI a Sparks-generated magical species or type starts with (SRD: 3 is a fair start). */
  magicalBaseMai: 3,
  icons: { species: "icons/svg/tree.svg", type: "icons/svg/sword.svg", ability: "icons/svg/upgrade.svg", flaw: "icons/svg/downgrade.svg" }
};

/* ------------------------------ Game loop ------------------------------- */
TAGANDTALLY.loop = {
  /** Actions each party member gets in a scene, whatever its time scope. A resolved roll spends one. */
  actionPoints: 10,
  /** Insights rolls are always level 5 (SRD). */
  insightLevel: 5,
  /** Countdown marks the scene's quest takes from a Fail-and roll in the scene (0 to disable). Time pressure on Advance uses the scope's factionTicks. */
  countdownOnFailAnd: 1,
  /** Simple Calendar movement for the scopes that are shorter than a day. */
  shiftHours: 4,
  combatMinutes: 10,
  /** How much world time a scene covers: days moved and faction "time passes" marks when it closes. */
  scopes: {
    combat: { label: "TAGANDTALLY.Loop.Scopes.combat", days: 0, factionTicks: 0 },
    shift: { label: "TAGANDTALLY.Loop.Scopes.shift", days: 0, factionTicks: 0 },
    day: { label: "TAGANDTALLY.Loop.Scopes.day", days: 1, factionTicks: 1 },
    week: { label: "TAGANDTALLY.Loop.Scopes.week", days: 7, factionTicks: 1 },
    month: { label: "TAGANDTALLY.Loop.Scopes.month", days: 30, factionTicks: 2 },
    year: { label: "TAGANDTALLY.Loop.Scopes.year", days: 365, factionTicks: 3 }
  },
  /** Scene actions: `roll` opens the Task Roll dialog with that roll type, the others open a tool. */
  actions: {
    investigate: { label: "TAGANDTALLY.Loop.Action.investigate", hint: "TAGANDTALLY.Loop.ActionHint.investigate", icon: "fa-magnifying-glass", kind: "investigate" },
    task: { label: "TAGANDTALLY.Loop.Action.task", hint: "TAGANDTALLY.Loop.ActionHint.task", icon: "fa-dice-d20", kind: "roll", rollType: "task" },
    socialize: { label: "TAGANDTALLY.Loop.Action.socialize", hint: "TAGANDTALLY.Loop.ActionHint.socialize", icon: "fa-comments", kind: "interact" },
    oracle: { label: "TAGANDTALLY.Loop.Action.oracle", hint: "TAGANDTALLY.Loop.ActionHint.oracle", icon: "fa-eye", kind: "oracle" },
    travel: { label: "TAGANDTALLY.Loop.Action.travel", hint: "TAGANDTALLY.Loop.ActionHint.travel", icon: "fa-route", kind: "travel" },
    combat: { label: "TAGANDTALLY.Loop.Action.combat", hint: "TAGANDTALLY.Loop.ActionHint.combat", icon: "fa-swords", kind: "combat" },
    loot: { label: "TAGANDTALLY.Loop.Action.loot", hint: "TAGANDTALLY.Loop.ActionHint.loot", icon: "fa-sack-dollar", kind: "loot" },
    workshop: { label: "TAGANDTALLY.Loop.Action.workshop", hint: "TAGANDTALLY.Loop.ActionHint.workshop", icon: "fa-hammer", kind: "workshop" },
    downtime: { label: "TAGANDTALLY.Loop.Action.downtime", hint: "TAGANDTALLY.Loop.ActionHint.downtime", icon: "fa-bed", kind: "downtime" }
  }
};

/* ------------------------------- Travel --------------------------------- */
TAGANDTALLY.travel = {
  /** Where the party explores: picks the Sparks tables an exploration rolls. Movement itself is done on the map. */
  modes: {
    wilderness: { label: "TAGANDTALLY.Travel.Wilderness", icon: "fa-tree" },
    urban: { label: "TAGANDTALLY.Travel.Urban", icon: "fa-city" },
    dungeon: { label: "TAGANDTALLY.Travel.Dungeon", icon: "fa-dungeon" }
  },
  /** New hex level from the level of the hex being left (11-12 on 1d10+2 count as 10). */
  hexLevel: [
    { min: 1, max: 2, formula: "1d4+2" },
    { min: 3, max: 4, formula: "1d6+2" },
    { min: 5, max: 6, formula: "1d8+2" },
    { min: 7, max: 10, formula: "1d10+2" }
  ],
  /** Rest encounter check, 2d6. */
  rest: {
    wilderness: [{ min: 2, max: 5, result: "nothing" }, { min: 6, max: 10, result: "encounter" }, { min: 11, max: 12, result: "discovery" }],
    safeZone: [{ min: 2, max: 5, result: "encounter" }, { min: 6, max: 10, result: "nothing" }, { min: 11, max: 12, result: "discovery" }]
  },
  /** Fantasy terrains with their own discovery tables. */
  discoveryTerrains: ["forest", "plains", "mountain", "swamp", "island", "desert", "wastelands", "magiclands"]
};

/* ------------------------------- Crafting -------------------------------- */
/** SRD Crafting: harvest, craft, augment (repair) and salvage tasks. DC = (level + rarity) * 3 → task level = level + rarity. */
TAGANDTALLY.crafting = {
  rarities: {
    0: { label: "TAGANDTALLY.Rarity.None", modifier: 0 },
    1: { label: "TAGANDTALLY.Rarity.Common", modifier: 1 },
    2: { label: "TAGANDTALLY.Rarity.Uncommon", modifier: 2 },
    3: { label: "TAGANDTALLY.Rarity.Rare", modifier: 3 },
    4: { label: "TAGANDTALLY.Rarity.Legendary", modifier: 4 }
  },
  /** Resource types (d8; 8 = roll again) and the Sparks resources.json categories that feed each. */
  resourceTypes: {
    ore: { label: "TAGANDTALLY.ResourceType.Ore", categories: ["oreResources"] },
    gemstone: { label: "TAGANDTALLY.ResourceType.Gemstone", categories: ["gemstoneResources"] },
    wood: { label: "TAGANDTALLY.ResourceType.Wood", categories: ["woodResources"] },
    fiber: { label: "TAGANDTALLY.ResourceType.Fiber", categories: ["fiberResources"] },
    liquid: { label: "TAGANDTALLY.ResourceType.Liquid", categories: ["liquidResources", "glandFluidCreatureParts"] },
    plants: { label: "TAGANDTALLY.ResourceType.Plants", categories: ["plantResources", "plantCreatureParts"] },
    essence: { label: "TAGANDTALLY.ResourceType.Essence", categories: ["essenceResources"] },
    part: { label: "TAGANDTALLY.ResourceType.Part", categories: ["organicCreatureParts", "constructCreatureParts", "magicalCreatureParts"] }
  },
  /** Each further attempt on the same target is hindered by this many steps. */
  retryHinder: 2,
  maxAugmentations: 9,
  craftedLevel: 1,
  craftedCost: 3,
  /** Applying a salvaged property is a Level 5 augmenting task. */
  salvageAugmentLevel: 5,
  /** Gear types a crafter can make; consumables are the only field craft. */
  craftTypes: ["weapon", "armor", "item", "trap", "consumable"],
  /** Outcome text keys and effects per task. */
  outcomes: {
    harvest: { failAnd: "destroyed", failBut: "intact", successBut: "levelDown", success: "equal", successAnd: "levelUp" },
    craft: { failAnd: "loseMaterials", failBut: "keepMaterials", successBut: "notExact", success: "intended", successAnd: "better" },
    augment: { failAnd: "loseMaterial", failBut: "keepMaterial", successBut: "notExact", success: "intended", successAnd: "better" },
    salvage: { failAnd: "destroyed", failBut: "undamaged", successBut: "diminished", success: "property", successAnd: "twoProperties" }
  }
};

/* ------------------------------- Factions -------------------------------- */
/** SRD Factions: goals progress through six phases to an End state on a tally of 5; a known goal also runs a countdown of 10. */
TAGANDTALLY.faction = {
  tallyMax: 5,
  countdownMax: 10,
  phases: [
    { id: "shadows", label: "TAGANDTALLY.Faction.Phase.Shadows", vibe: "TAGANDTALLY.Faction.Vibe.Shadows", text: "TAGANDTALLY.Faction.Text.Shadows" },
    { id: "whispers", label: "TAGANDTALLY.Faction.Phase.Whispers", vibe: "TAGANDTALLY.Faction.Vibe.Whispers", text: "TAGANDTALLY.Faction.Text.Whispers" },
    { id: "signs", label: "TAGANDTALLY.Faction.Phase.Signs", vibe: "TAGANDTALLY.Faction.Vibe.Signs", text: "TAGANDTALLY.Faction.Text.Signs" },
    { id: "omens", label: "TAGANDTALLY.Faction.Phase.Omens", vibe: "TAGANDTALLY.Faction.Vibe.Omens", text: "TAGANDTALLY.Faction.Text.Omens" },
    { id: "manifestation", label: "TAGANDTALLY.Faction.Phase.Manifestation", vibe: "TAGANDTALLY.Faction.Vibe.Manifestation", text: "TAGANDTALLY.Faction.Text.Manifestation" },
    { id: "brink", label: "TAGANDTALLY.Faction.Phase.Brink", vibe: "TAGANDTALLY.Faction.Vibe.Brink", text: "TAGANDTALLY.Faction.Text.Brink" },
    { id: "end", label: "TAGANDTALLY.Faction.Phase.End", vibe: "TAGANDTALLY.Faction.Vibe.End", text: "TAGANDTALLY.Faction.Text.End", end: true }
  ]
};
