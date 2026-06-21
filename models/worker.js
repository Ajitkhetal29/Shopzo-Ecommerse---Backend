import {workerData, parentPort} from "node:worker_threads";

const number = workerData;

let result = 0;
for (let i = 0; i < number; i++) {
    result += i;
}
parentPort.postMessage(result);