from __future__ import annotations
import math, time
from .common import FEATURE_ORDER, split_rows

def fit(rows, epochs=3000, learning_rate=.03, l2=.01):
    train,test=split_rows(rows)
    if not train: return None, train, test
    p=len(FEATURE_ORDER)
    means=[sum(r["x"][j] for r in train)/len(train) for j in range(p)]
    stds=[]
    for j in range(p):
        variance=sum((r["x"][j]-means[j])**2 for r in train)/max(1,len(train)-1)
        stds.append(max(1e-6, math.sqrt(variance)))
    weights=[0.0]*p; intercept=sum(r["y"] for r in train)/len(train)
    for _ in range(epochs):
        grad_w=[0.0]*p; grad_b=0.0
        for row in train:
            z=[(v-m)/s for v,m,s in zip(row["x"],means,stds)]
            err=intercept+sum(w*v for w,v in zip(weights,z))-row["y"]
            grad_b+=err
            for j in range(p): grad_w[j]+=err*z[j]
        n=len(train); intercept-=learning_rate*(2*grad_b/n)
        for j in range(p): weights[j]-=learning_rate*(2*grad_w[j]/n+2*l2*weights[j])
    return {"featureOrder":FEATURE_ORDER,"means":means,"stds":stds,"weights":weights,"intercept":intercept,"trainedExamples":len(train),"trainedAt":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),"algorithm":"ridge_gradient_descent_v1"}, train, test
