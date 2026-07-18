from __future__ import annotations
import hashlib, json, math
from pathlib import Path

FEATURE_ORDER = ["base_score", "climate", "water", "chemicals", "materials", "waste_circularity", "durability", "coverage", "confidence"]

def load_json(path, fallback=None):
    p=Path(path)
    if not p.exists(): return {} if fallback is None else fallback
    return json.loads(p.read_text(encoding="utf-8"))

def save_json(path, value):
    p=Path(path); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def load_events(path):
    p=Path(path)
    if not p.exists(): return []
    out=[]
    for line in p.read_text(encoding="utf-8").splitlines():
        if not line.strip(): continue
        try: out.append(json.loads(line))
        except json.JSONDecodeError: pass
    return out

def training_rows(events):
    predictions={}
    for event in events:
        if event.get("eventType")=="prediction":
            pred=event.get("prediction", {})
            pid=pred.get("predictionId") or event.get("id")
            predictions[pid]=event
    rows=[]
    for feedback in events:
        if feedback.get("eventType")!="expert_feedback" or feedback.get("labelStatus")!="validated": continue
        pred=predictions.get(feedback.get("predictionId"))
        if not pred: continue
        result=pred.get("prediction", {})
        dims=result.get("dimensions", {})
        features={
            "base_score": float(result.get("score", 0)),
            "climate": float(dims.get("climate", 0)),
            "water": float(dims.get("water", 0)),
            "chemicals": float(dims.get("chemicals", 0)),
            "materials": float(dims.get("materials", 0)),
            "waste_circularity": float(dims.get("wasteCircularity", 0)),
            "durability": float(dims.get("durability", 0)),
            "coverage": float(result.get("coverage", 0))/100,
            "confidence": float(result.get("confidence", 0))/100,
        }
        rows.append({"id": feedback.get("id"), "prediction_id": feedback.get("predictionId"), "category": pred.get("category", "generic"), "x": [features[k] for k in FEATURE_ORDER], "y": float(feedback.get("expertScore")), "base": features["base_score"]})
    return rows

def split_rows(rows, test_ratio=.2):
    train=[]; test=[]
    for row in rows:
        digest=int(hashlib.sha256(str(row["prediction_id"]).encode()).hexdigest()[:8],16)
        (test if digest % 100 < int(test_ratio*100) else train).append(row)
    if rows and not test: test=[rows[-1]]; train=rows[:-1]
    return train,test

def predict_linear(model, x):
    z=[(v-m)/max(1e-8,s) for v,m,s in zip(x, model["means"], model["stds"])]
    y=model["intercept"]+sum(w*v for w,v in zip(model["weights"], z))
    return max(0.0,min(5.0,y))

def metrics(rows, predictor):
    if not rows: return {"n":0,"mae":None,"rmse":None,"byCategory":{}}
    errors=[]; groups={}
    for row in rows:
        e=abs(predictor(row)-row["y"]); errors.append(e); groups.setdefault(row["category"],[]).append(e)
    return {"n":len(rows),"mae":sum(errors)/len(errors),"rmse":math.sqrt(sum(e*e for e in errors)/len(errors)),"byCategory":{k:{"n":len(v),"mae":sum(v)/len(v)} for k,v in groups.items()}}
