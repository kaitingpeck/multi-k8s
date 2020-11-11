docker build -t kaitingpeck/multi-client:latest -t kaitingpeck/multi-client:$GIT_SHA -f ./client/Dockerfile ./client
docker build -t kaitingpeck/multi-server:latest -t kaitingpeck/multi-server:$GIT_SHA -f ./server/Dockerfile ./server
docker build -t kaitingpeck/multi-worker:latest -t kaitingpeck/multi-worker:$GIT_SHA -f ./worker/Dockerfile ./worker

docker push kaitingpeck/multi-client:latest
docker push kaitingpeck/multi-server:latest
docker push kaitingpeck/multi-worker:latest

docker push kaitingpeck/multi-client:$GIT_SHA
docker push kaitingpeck/multi-server:$GIT_SHA
docker push kaitingpeck/multi-worker:$GIT_SHA

kubectl apply -f k8s

kubectl set image deployments/server-deployment server=kaitingpeck/multi-server:$GIT_SHA
kubectl set image deployments/client-deployment client=kaitingpeck/multi-client:$GIT_SHA
kubectl set image deployments/worker-deployment worker=kaitingpeck/multi-worker:$GIT_SHA