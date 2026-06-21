import {Worker} from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runHeavyTask(data){
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, "worker.js"), {
            workerData: data
        });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

async function main() {
    console.log("Starting heavy task...");
    try{
        const result = await runHeavyTask(10000000);
        console.log("Task completed with result:", result);
    }catch (error) {
        console.error("Error in main function:", error);
    }
}

main();