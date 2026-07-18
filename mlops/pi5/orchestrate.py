from __future__ import annotations
import argparse, copy, time
from pathlib import Path
from .common import load_events, training_rows, load_json, save_json
from .train import fit
from .evaluate import evaluate, promotion_decision
from .monitor import monitor

def run(events_path, champion_path, challenger_path, report_path, allow_promote=False):
    events=load_events(events_path); rows=training_rows(events); champion=load_json(champion_path,{})
    challenger,train_rows,test_rows=fit(rows)
    evaluation=evaluate(challenger,test_rows)
    decision=promotion_decision(evaluation,champion.get("promotionPolicy",{}),len(rows))
    monitoring=monitor(events,rows)
    if challenger:
        candidate=copy.deepcopy(champion); candidate.update({"modelVersion":f"pi5-calibrated-{time.strftime('%Y%m%d%H%M%S',time.gmtime())}","modelType":"rules_plus_linear_calibration","status":"challenger","trainedExamples":len(rows),"calibration":challenger,"evaluation":evaluation,"promotionDecision":decision})
        save_json(challenger_path,candidate)
        if allow_promote and decision["promote"]:
            candidate["status"]="champion"; candidate["promotedAt"]=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()); save_json(champion_path,candidate)
    report={"events":len(events),"validatedExamples":len(rows),"trainExamples":len(train_rows),"testExamples":len(test_rows),"evaluation":evaluation,"promotionDecision":decision,"monitoring":monitoring}
    save_json(report_path,report); return report

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--events",default="data/pi5/production-events.jsonl"); parser.add_argument("--champion",default="models/pi5/champion.json"); parser.add_argument("--challenger",default="models/pi5/challenger.json"); parser.add_argument("--report",default="reports/pi5/latest.json"); parser.add_argument("--allow-promote",action="store_true")
    args=parser.parse_args(); report=run(args.events,args.champion,args.challenger,args.report,args.allow_promote); print(report)
if __name__=="__main__": main()
