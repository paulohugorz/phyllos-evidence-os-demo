import json, tempfile, unittest
from pathlib import Path
from mlops.pi5.common import training_rows
from mlops.pi5.train import fit
from mlops.pi5.evaluate import evaluate, promotion_decision
from mlops.pi5.orchestrate import run

class PI5PipelineTest(unittest.TestCase):
    def synthetic_events(self, n=90):
        events=[]
        for i in range(n):
            pid=f"p-{i}"
            base=1.3+(i%35)/10
            dims={"climate":base,"water":min(5,base+.2),"chemicals":2.5,"materials":3.0,"wasteCircularity":3.2,"durability":3.4}
            score=sum([dims["climate"]*.3,dims["water"]*.2,dims["chemicals"]*.15,dims["materials"]*.15,dims["wasteCircularity"]*.1,dims["durability"]*.1])
            expert=max(0,min(5,score*.92+.22))
            events.append({"id":pid,"eventType":"prediction","category":"camisa" if i%2 else "camiseta","prediction":{"predictionId":pid,"score":score,"dimensions":dims,"coverage":82,"confidence":74}})
            events.append({"id":f"f-{i}","eventType":"expert_feedback","predictionId":pid,"expertScore":expert,"labelStatus":"validated"})
        return events
    def test_training_rows_join_predictions_feedback(self):
        rows=training_rows(self.synthetic_events(5)); self.assertEqual(len(rows),5); self.assertEqual(len(rows[0]["x"]),9)
    def test_model_fits_and_evaluates(self):
        rows=training_rows(self.synthetic_events()); model,train,test=fit(rows,epochs=800)
        result=evaluate(model,test); self.assertLess(result["challenger"]["mae"],.25)
    def test_promotion_requires_minimum_samples(self):
        rows=training_rows(self.synthetic_events(10)); model,_,test=fit(rows,epochs=300)
        decision=promotion_decision(evaluate(model,test),{"minValidatedExamples":70},10); self.assertFalse(decision["promote"])
    def test_orchestrator_writes_reports(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); events=root/"events.jsonl"; champion=root/"champion.json"
            events.write_text("\n".join(json.dumps(e) for e in self.synthetic_events())+"\n")
            champion.write_text(json.dumps({"modelVersion":"baseline","promotionPolicy":{"minValidatedExamples":70,"minImprovementPct":1,"maxGlobalMae":.6,"maxSubgroupMae":.9}}))
            report=run(events,champion,root/"challenger.json",root/"report.json",allow_promote=True)
            self.assertEqual(report["validatedExamples"],90); self.assertTrue((root/"report.json").exists())
if __name__=="__main__": unittest.main()
