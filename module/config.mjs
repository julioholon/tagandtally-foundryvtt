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
