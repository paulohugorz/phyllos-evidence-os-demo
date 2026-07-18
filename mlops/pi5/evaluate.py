from .common import metrics, predict_linear

def evaluate(challenger, test_rows):
    challenger_metrics=metrics(test_rows, lambda row: predict_linear(challenger,row["x"])) if challenger else {"n":0,"mae":None,"rmse":None,"byCategory":{}}
    champion_metrics=metrics(test_rows, lambda row: row["base"])
    return {"challenger":challenger_metrics,"champion":champion_metrics}

def promotion_decision(evaluation, policy, total_validated):
    c=evaluation["challenger"]; b=evaluation["champion"]
    reasons=[]
    if total_validated < int(policy.get("minValidatedExamples",70)): reasons.append("minimum_validated_examples_not_met")
    if not c.get("n"): reasons.append("holdout_empty")
    if c.get("mae") is not None and c["mae"] > float(policy.get("maxGlobalMae",.55)): reasons.append("global_mae_gate_failed")
    max_group=max([v["mae"] for v in c.get("byCategory",{}).values()] or [0])
    if max_group > float(policy.get("maxSubgroupMae",.85)): reasons.append("subgroup_mae_gate_failed")
    if c.get("mae") is not None and b.get("mae") not in (None,0):
        improvement=(b["mae"]-c["mae"])/b["mae"]*100
        if improvement < float(policy.get("minImprovementPct",2)): reasons.append("minimum_improvement_not_met")
    else: improvement=0
    return {"promote":not reasons,"reasons":reasons,"improvementPct":improvement,"maxSubgroupMae":max_group}
