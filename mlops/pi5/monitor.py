from collections import Counter

def monitor(events, rows):
    predictions=[e for e in events if e.get("eventType")=="prediction"]
    recent=predictions[-30:]; previous=predictions[-60:-30]
    def average(block,key):
        vals=[float(e.get("prediction",{}).get(key,0)) for e in block]
        return sum(vals)/len(vals) if vals else None
    recent_score=average(recent,"score"); previous_score=average(previous,"score")
    drift=abs(recent_score-previous_score) if recent_score is not None and previous_score is not None else None
    categories=Counter(e.get("category","generic") for e in predictions)
    return {"predictionCount":len(predictions),"validatedCount":len(rows),"recentMeanScore":recent_score,"previousMeanScore":previous_score,"absoluteScoreDrift":drift,"driftStatus":"alert" if drift is not None and drift>.6 else "ok","categories":dict(categories),"dataQuality":{"orphanFeedback":max(0,len([e for e in events if e.get("eventType")=="expert_feedback"])-len(rows)),"trainingCoveragePct":round(len(rows)/max(1,len(predictions))*100,2)}}
