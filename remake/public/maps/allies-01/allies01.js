/**
 * Allies-01 Campaign Script — JS version for ScriptRuntime
 * Translated from OpenRA's allies01.lua
 *
 * APIs used:
 *   Player.GetPlayer, Actor.Create, Trigger.AfterDelay, Trigger.OnKilled
 *   Trigger.OnAllKilled, Trigger.OnAnyKilled, Utils.Do
 *   Reinforcements.ReinforceWithTransport, Reinforcements.Reinforce
 *   Media.PlaySpeechNotification, Media.DisplayMessage
 *   AddPrimaryObjective, AddSecondaryObjective
 */

// ── 常量 ──
var InsertionHelicopterType = "tran.insertion";
var InsertionPath = [InsertionEntry.Location, InsertionLZ.Location];
var ExtractionHelicopterType = "tran.extraction";
var ExtractionPath = [SouthReinforcementsPoint.Location, ExtractionLZ.Location];
var JeepReinforcements = ["jeep", "jeep"];
var TanyaReinforcements = ["e7.noautotarget"];
var EinsteinType = "einstein";
var FlareType = "flare";
var CruisersReinforcements = ["ca", "ca", "ca", "ca"];
var OpeningAttack = [Patrol1, Patrol2, Patrol3, Patrol4];
var Responders = [Response1, Response2, Response3, Response4, Response5];
var LabGuardsTeam = [LabGuard1, LabGuard2, LabGuard3];

// ── 变量 ──
var Heli = null;
var FindEinsteinObjective = null;
var TanyaSurviveObjective = null;
var EinsteinSurviveObjective = null;
var CivilProtectionObjective = null;
var ExtractObjective = null;
var CollateralDamage = false;
var SovietArmy = [];

// ── 函数 ──

function SendInsertionHelicopter() {
  var result = Reinforcements.ReinforceWithTransport(Greece, InsertionHelicopterType,
    TanyaReinforcements, InsertionPath, [InsertionEntry.Location]);
  var passengers = result[1];
  var tanya = passengers[0];
  if (tanya) {
    Trigger.OnKilled(tanya, TanyaKilledInAction);
  }
  Trigger.AfterDelay(DateTime.Seconds(4), function() {
    Media.DisplayMessage("Rules of engagement: Tanya is armed with C4 and a silenced pistol.");
  });
}

function SendJeeps() {
  Reinforcements.Reinforce(Greece, JeepReinforcements, InsertionPath, DateTime.Seconds(2));
  Media.PlaySpeechNotification(Greece, "ReinforcementsArrived");
}

function RunInitialActivities() {
  SendInsertionHelicopter();

  Utils.Do(OpeningAttack, function(a) {
    IdleHunt(a);
  });

  Trigger.OnKilled(Patrol3, function() {
    if (Civilian1 && !Civilian1.IsDead) {
      // Civilian1.Move(CivMove.Location);
    }
  });

  Trigger.OnKilled(BarrelPower, function() {
    if (Civilian2 && !Civilian2.IsDead) {
      // Civilian2.Move(CivMove.Location);
    }
    Utils.Do(Responders, function(r) {
      if (r && !r.IsDead) {
        IdleHunt(r);
      }
    });
  });
}

function LabGuardsKilled() {
  CreateEinstein();

  Trigger.AfterDelay(DateTime.Seconds(2), function() {
    Actor.Create(FlareType, true, { Owner: "England", Location: ExtractionFlarePoint.Location });
    Media.PlaySpeechNotification(Greece, "SignalFlareNorth");
    SendExtractionHelicopter();
  });

  Trigger.AfterDelay(DateTime.Seconds(10), function() {
    Media.PlaySpeechNotification(Greece, "AlliedReinforcementsArrived");
    Actor.Create("camera", true, { Owner: "Greece", Location: CruiserCameraPoint.Location });
    SendCruisers();
  });

  Trigger.AfterDelay(DateTime.Seconds(12), function() {
    for (var i = 0; i < 2; i++) {
      Trigger.AfterDelay(DateTime.Seconds(i), function() {
        Media.PlaySoundNotification(Greece, "AlertBuzzer");
      });
    }
    Utils.Do(SovietArmy, function(a) {
      if (a && !a.IsDead) {
        Trigger.OnIdle(a, function() { IdleHunt(a); });
      }
    });
  });
}

function SendExtractionHelicopter() {
  var result = Reinforcements.ReinforceWithTransport(Greece, ExtractionHelicopterType, null, ExtractionPath);
  Heli = result[0];
  if (Einstein && !Einstein.IsDead) {
    Trigger.OnRemovedFromWorld(Einstein, EvacuateHelicopter);
  }
  if (Heli) {
    Trigger.OnKilled(Heli, RescueFailed);
    Trigger.OnRemovedFromWorld(Heli, HelicopterGone);
  }
}

function EvacuateHelicopter() {
  if (Heli && !Heli.IsDead) {
    Media.PlaySpeechNotification(Greece, "TargetRescued");
    Trigger.AfterDelay(DateTime.Seconds(1), function() {
      Greece.MarkCompletedObjective(ExtractObjective);
      Greece.MarkCompletedObjective(EinsteinSurviveObjective);
      if (!Greece.IsObjectiveFailed(TanyaSurviveObjective)) {
        Greece.MarkCompletedObjective(TanyaSurviveObjective);
      }
      if (!CollateralDamage) {
        Greece.MarkCompletedObjective(CivilProtectionObjective);
      }
    });
  }
}

function SendCruisers() {
  var i = 1;
  Utils.Do(CruisersReinforcements, function(cruiser) {
    var ca = Actor.Create(cruiser, true, { Owner: "England", Location: { x: SouthReinforcementsPoint.Location.x + 2 * i, y: SouthReinforcementsPoint.Location.y } });
    var target = Map.NamedActor("CruiserPoint" + i);
    if (ca && target) {
      // ca.Move(target.Location);
    }
    i++;
  });
}

function LabDestroyed() {
  if (!Einstein) {
    RescueFailed();
  }
}

function RescueFailed() {
  Media.PlaySpeechNotification(Greece, "ObjectiveNotMet");
  Greece.MarkFailedObjective(EinsteinSurviveObjective);
}

function TanyaKilledInAction() {
  Media.PlaySpeechNotification(Greece, "ObjectiveNotMet");
  Greece.MarkFailedObjective(TanyaSurviveObjective);
}

function OilPumpDestroyed() {
  Trigger.AfterDelay(DateTime.Seconds(5), SendJeeps);
}

function CiviliansKilled() {
  Greece.MarkFailedObjective(CivilProtectionObjective);
  Media.PlaySpeechNotification(Greece, "ObjectiveNotMet");
  CollateralDamage = true;
}

function LostMate() {
  if (Civilian2 && !Civilian2.IsDead) {
    // Civilian2.Panic();
  }
}

function CreateEinstein() {
  Greece.MarkCompletedObjective(FindEinsteinObjective);
  Media.PlaySpeechNotification(Greece, "ObjectiveMet");
  Einstein = Actor.Create(EinsteinType, true, { Location: EinsteinSpawnPoint.Location, Owner: "Greece" });
  if (Einstein) {
    // Einstein.Scatter();
    Trigger.OnKilled(Einstein, RescueFailed);
  }
  ExtractObjective = AddPrimaryObjective("Greece", "extract-einstein-helicopter");
  Trigger.AfterDelay(DateTime.Seconds(1), function() {
    Media.PlaySpeechNotification(Greece, "TargetFreed");
  });
}

function SetUnitStances() {
  Utils.Do(Map.NamedActors, function(a) {
    if (a.Owner === "Greece") {
      a.Stance = "Defend";
    }
  });
}

function Tick() {
  USSR.Resources = USSR.Resources - (0.01 * USSR.ResourceCapacity / 25);
}

// ── 入口 ──

function WorldLoaded() {
  Greece = Player.GetPlayer("Greece");
  England = Player.GetPlayer("England");
  USSR = Player.GetPlayer("USSR");

  InitObjectives("Greece");

  FindEinsteinObjective = AddPrimaryObjective("Greece", "find-einstein");
  TanyaSurviveObjective = AddPrimaryObjective("Greece", "tanya-survive");
  EinsteinSurviveObjective = AddPrimaryObjective("Greece", "einstein-survive");
  CivilProtectionObjective = AddSecondaryObjective("Greece", "protect-civilians");

  RunInitialActivities();

  Trigger.OnKilled(Lab, LabDestroyed);
  Trigger.OnKilled(OilPump, OilPumpDestroyed);

  SovietArmy = USSR.GetGroundAttackers();

  Trigger.OnAllKilled(LabGuardsTeam, LabGuardsKilled);

  CollateralDamage = false;
  var civilianTeam = [Civilian1, Civilian2];
  Trigger.OnAnyKilled(civilianTeam, CiviliansKilled);
  Trigger.OnKilled(Civilian1, LostMate);

  SetUnitStances();

  Trigger.AfterDelay(DateTime.Seconds(5), function() {
    Actor.Create("camera", true, { Owner: "Greece", Location: BaseCameraPoint.Location });
  });

  Camera.Position = InsertionLZ.Location;
}

// ── 入口：引擎加载完成后自动执行 ──
WorldLoaded();
