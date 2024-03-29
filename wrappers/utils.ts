import { mnemonicToWalletKey } from 'ton-crypto';
import { BitString, Cell, beginCell, Builder, Dictionary, Slice } from '@ton/core';
import { sha256 } from '@ton/crypto';
import BN from 'bn.js';

import dotenv from 'dotenv';

dotenv.config();

const mnemonic: any = process.env.WALLET_MNEMONIC;
export async function keypair() {
    return await mnemonicToWalletKey(mnemonic.split(' '));
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

import walletHex from './BJettonWallet.compiled.json';
const JETTON_WALLET_CODE = Cell.fromBoc(Buffer.from(walletHex.hex, 'hex'))[0];

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimal' | 'extends';

const jettonOnChainMetadataSpec: {
    [key in JettonMetaDataKeys]: 'utf8' | 'ascii' | undefined;
} = {
    name: 'utf8',
    description: 'utf8',
    image: 'ascii',
    symbol: 'utf8',
    decimal: 'utf8',
    extends: 'utf8',
};

export async function buildTokenMetadataCellV2(data: { [s: string]: string | undefined }): Promise<Cell> {
    const KEYLEN = 256;
    const keys = Dictionary.Keys.BitString(KEYLEN);
    const vals = Dictionary.Values.Cell();
    const dict = Dictionary.empty(keys, vals);

    for (const [k, v] of Object.entries(data)) {
        if (!jettonOnChainMetadataSpec[k as JettonMetaDataKeys]) throw new Error(`Unsupported onchain key: ${k}`);
        if (v === undefined || v === '')
            return new Promise((resolve) => {
                resolve(new Cell());
            });

        let bufferToStore = Buffer.from(v, jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);

        const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

        const builder = new Builder();
        builder.storeUint(SNAKE_PREFIX, 8);
        let currentCell = builder;

        while (bufferToStore.length > 0) {
            currentCell.storeBuffer(bufferToStore.subarray(0, CELL_MAX_SIZE_BYTES));
            bufferToStore = bufferToStore.subarray(CELL_MAX_SIZE_BYTES);
            if (bufferToStore.length > 0) {
                const newCell = new Builder();
                currentCell.storeRef(newCell.asCell());
                currentCell = newCell;
            }
        }
        const key_buf = await sha256(k);
        const key_str = new BitString(key_buf, 0, KEYLEN);
        dict.set(key_str, builder.asCell());
    }

    const metadata = beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
    return new Promise((resolve) => {
        resolve(metadata);
    });
}

export async function parseTokenMetadata(metadata: Cell): Promise<{ [s in JettonMetaDataKeys]?: string }> {
    const res: { [s in JettonMetaDataKeys]?: string } = {};

    const KEYLEN = 256;
    const content = metadata.beginParse();
    if (content.loadUint(8) !== ONCHAIN_CONTENT_PREFIX) {
        throw new Error('Expected onchain content marker');
    }

    const keys = Dictionary.Keys.BitString(KEYLEN);
    const vals = Dictionary.Values.Cell();

    const dict = content.loadDict(keys, vals);

    const cell_to_val = (c: Cell = new Cell(), v: Buffer, is_first: boolean) => {
        let s = c.beginParse();

        if (is_first && s.loadUint(8) !== SNAKE_PREFIX) {
            throw new Error('Only snake format is supported');
        }

        v = Buffer.concat([v, s.loadBuffer(s.remainingBits / 8)]);

        if (s.remainingRefs === 1) {
            v = cell_to_val(s.asCell(), v, false);
        }

        return v;
    };

    const meta_keys = Object.keys(jettonOnChainMetadataSpec);
    for (let i = 0; i < meta_keys.length; i++) {
        const k = meta_keys[i];
        const key_hash = await sha256(k);
        const key_index = new BitString(key_hash, 0, KEYLEN);

        const buffer = Buffer.from('');
        const val_cell = dict.get(key_index);
        const val = cell_to_val(val_cell, buffer, true).toString(jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);

        // const val = dict.get(key_index)?.toString(jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);

        if (val) res[k as JettonMetaDataKeys] = val;
    }

    return new Promise((resolve) => {
        resolve(res);
    });
}
