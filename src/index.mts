import { QdrantClient, Distance, PointStruct, UpsertPoints,PointId, Vectors } from '@qdrant/js-client-grpc';

const GRPC_HOST_URL = 'http://localhost:3000';
const GRPC_PORT = 6334;

const COLLECTION_NAME = 'dev6';
const VECTOR_SIZE:any = 1024;
const NUM_VECTORS = 1000;
const LIMIT:bigint=10n;

const client = new QdrantClient({host: GRPC_HOST_URL, port:GRPC_PORT });

async function setupQdrant() {
    const collectionExists = await client.api('collections').collectionExists({collectionName:COLLECTION_NAME});
    if (collectionExists.result?.exists) {
        await client.api('collections').delete({collectionName:COLLECTION_NAME});
        console.log(collectionExists.result?.exists)
    }
   await client.api('collections').create({collectionName:COLLECTION_NAME,vectorsConfig:{config:{case:"params",value:{size:VECTOR_SIZE,distance:Distance.Cosine}}}});
   console.log(await client.api('collections').list({}))
}

// setupQdrant()
async function embedQdrant(vectors: number[][]) {
    const batchSize = 500;
    for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);

        const points: PointStruct[] = [];
        for (let j = 0; j < batch.length; j++) {
            const vector = batch[j];
            const point = new PointStruct({
                id: new PointId({ pointIdOptions: { case: "num", value: BigInt(i + j) } }),
                vectors: new Vectors({
                  vectorsOptions: {
                    value: { data: vector, vectorsCount: VECTOR_SIZE },
                    case: "vector"
                  }
                }),
                payload: {}
              });
              
            points.push(point);
        }
        // console.log(points[0].vectors?.vectorsOptions.value,"line 34")
        await client.api('points').upsert({collectionName:COLLECTION_NAME,points:points});
    }
}

async function queryQdrant(queryVector: number[]) {
    const response = await client.api('points').search({collectionName:COLLECTION_NAME, vector:queryVector, limit:LIMIT});
    return response.result;
}

async function runFunc() {
    await setupQdrant();

    console.log("\nEmbedding in Qdrant...");
    const vectors = Array.from({ length: NUM_VECTORS }, () =>
        Array.from({ length: VECTOR_SIZE }, () => Math.random())
    );
    await embedQdrant(vectors);

    console.log("\nTesting query performance...");
    const queryVector = Array.from({ length: VECTOR_SIZE }, () => Math.random());
    const results = await queryQdrant(queryVector);
    console.log("\nQuery Results:");
}

runFunc()