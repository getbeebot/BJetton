import { mnemonicToWalletKey } from 'ton-crypto';
import dotenv from 'dotenv';
import { Cell, beginCell } from '@ton/core';

dotenv.config();

const mnemonic: any = process.env.WALLET_MNEMONIC;
export async function keypair() {
    return await mnemonicToWalletKey(mnemonic.split(' '));
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildTokenMetadataCell(data: any): Cell {
    const decimals = parseInt(data.decimal);
    // const protocol = parseInt(data.protocol);
    const group_id = BigInt(data.group_id);
    const group_owner = BigInt(data.group_owner);

    return beginCell()
        .storeStringRefTail(data.name)
        .storeStringRefTail(data.description)
        .storeStringRefTail(data.image)
        .storeStringRefTail(data.symbol)
        .storeUint(decimals, 8)
        .storeUint(1, 8) // for our protocol, always be 1
        .storeInt(group_id, 64)
        .storeInt(group_owner, 64)
        .endCell();
}

/*
import { sha256 } from '@ton/crypto';
import { Cell, beginCell, Builder, Dictionary, Slice, Address } from '@ton/core';

import walletHex from '../build/BJettonWallet.compiled.json';

const JETTON_WALLET_CODE = Cell.fromBoc(Buffer.from(walletHex.hex, 'hex'))[0];

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;

export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimal' | 'group_id' | 'group_owner';
// export type JettonMetaDataKeys = 'name' | 'description' | 'image' | 'symbol' | 'decimal';

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



export function buildTokenMetadataCell(data: { [s: string]: string | undefined }): Cell {
  const KEYLEN = 256;
  const dict = beginDict(KEYLEN);

  Object.entries(data).forEach(([k, v]: [string, string | undefined]) => {
    if (!jettonOnChainMetadataSpec[k as JettonMetaDataKeys])
      throw new Error(`Unsupported onchain key: ${k}`);
    if (v === undefined || v === "") return;

    let bufferToStore = Buffer.from(v, jettonOnChainMetadataSpec[k as JettonMetaDataKeys]);

    const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);

    const rootCell = new Cell();
    rootCell.bits.writeUint8(SNAKE_PREFIX);
    let currentCell = rootCell;

    while (bufferToStore.length > 0) {
      currentCell.bits.writeBuffer(bufferToStore.slice(0, CELL_MAX_SIZE_BYTES));
      bufferToStore = bufferToStore.slice(CELL_MAX_SIZE_BYTES);
      if (bufferToStore.length > 0) {
        const newCell = new Cell();
        currentCell.refs.push(newCell);
        currentCell = newCell;
      }
    }
    console.log(rootCell);

    dict.storeRef(sha256(k), rootCell);
  });

  return beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict.endDict()).endCell();
}
*/
