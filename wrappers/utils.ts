import { sha256 } from '@ton/crypto';
import { Cell, beginCell, Builder, Dictionary, Slice } from '@ton/core';

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimal' | 'group_id' | 'group_owner';

const jettonOnChainMetadataSpec: {
    [key in JettonMetaDataKeys]: 'utf8' | 'ascii' | undefined;
} = {
    name: 'utf8',
    description: 'utf8',
    image: 'ascii',
    symbol: 'utf8',
    decimal: 'utf8',
    group_id: 'utf8',
    group_owner: 'utf8',
};

export async function buildTokenMetadataCell(data: { [s: string]: string | undefined }): Promise<Cell> {
    // const KEYLEN = 256;
    let dict = Dictionary.empty<Buffer, Cell>();

    Object.entries(data).forEach(async ([k, v]: [string, string | undefined]) => {
        if (!jettonOnChainMetadataSpec[k as JettonMetaDataKeys]) throw new Error(`Unsupported onchain key: ${k}`);
        if (v === undefined || v === '') return;

        let bufferToStore = Buffer.from(v, jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);

        const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

        const rootCell = new Cell();
        rootCell.asBuilder().storeUint(SNAKE_PREFIX, 8);
        // rootCell.bits.writeUint8(SNAKE_PREFIX);
        let currentCell = rootCell;

        while (bufferToStore.length > 0) {
            // currentCell.bits.writeBuffer(bufferToStore.slice(0, CELL_MAX_SIZE_BYTES));
            currentCell.asBuilder().storeBuffer(bufferToStore.subarray(0, CELL_MAX_SIZE_BYTES));
            bufferToStore = bufferToStore.slice(CELL_MAX_SIZE_BYTES);
            if (bufferToStore.length > 0) {
                const newCell = new Cell();
                currentCell.refs.push(newCell);
                currentCell = newCell;
            }
        }

        const key = await sha256(k);
        dict.set(key, rootCell);
    });

    const metadata = beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
    return new Promise((resolve) => {
        resolve(metadata);
    });
}
