import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';
import { Op } from './JettonConstants';

export type BJettonConfig = {
    admin_address: Address;
    content: Cell;
    jetton_wallet_code: Cell;
};

export function BJettonConfigToCell(config: BJettonConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.admin_address)
        .storeRef(config.content)
        .storeRef(config.jetton_wallet_code)
        .endCell();
}

export class BJetton implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new BJetton(address);
    }

    static createFromConfig(config: BJettonConfig, code: Cell, workchain = 0) {
        const data = BJettonConfigToCell(config);
        const init = { code, data };
        return new BJetton(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    protected static jettonInternalTransfer(
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        response_addr?: Address,
        query_id: number | bigint = 0,
    ) {
        return beginCell()
            .storeUint(Op.internal_transfer, 32)
            .storeUint(query_id, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(response_addr)
            .storeCoins(forward_ton_amount)
            .storeBit(false)
            .endCell();
    }

    static mintMessage(
        from: Address,
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint,
        query_id: number | bigint = 0,
    ) {
        const mintMsg = beginCell()
            .storeUint(Op.internal_transfer, 32)
            .storeUint(0, 64)
            .storeCoins(jetton_amount)
            .storeAddress(null)
            .storeAddress(from) // Response addr
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(null)
            .endCell();

        return beginCell()
            .storeUint(Op.mint, 32)
            .storeUint(query_id, 64) // op, queryId
            .storeAddress(to)
            .storeCoins(total_ton_amount)
            .storeCoins(jetton_amount)
            .storeRef(mintMsg)
            .endCell();
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        to: Address,
        jetton_amount: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint,
    ) {
        if (total_ton_amount <= forward_ton_amount) {
            throw new Error('Total ton amount should be > forward amount');
        }
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: BJetton.mintMessage(this.address, to, jetton_amount, forward_ton_amount, total_ton_amount),
            value: total_ton_amount + toNano('0.015'),
        });
    }

    static changeAdminMessage(newOwner: Address) {
        return beginCell()
            .storeUint(Op.change_admin, 32)
            .storeUint(0, 64) // op, queryId
            .storeAddress(newOwner)
            .endCell();
    }

    async sendChangeAdmin(provider: ContractProvider, via: Sender, newOwner: Address) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: BJetton.changeAdminMessage(newOwner),
            value: toNano('0.05'),
        });
    }

    async getJettonData(provider: ContractProvider) {
        const { stack } = await provider.get('get_jetton_data', []);
        const supply = stack.readBigNumber();
        const mintable = stack.readNumber();
        const admin = stack.readAddress();
        const content = stack.readCell();
        return { supply, mintable, admin, content };
    }

    async getJettonWrappedData(provider: ContractProvider) {
        const { stack } = await provider.get('get_wrapped_token_data', []);

        const name_cell = stack.readCell();
        const name = this.cell2str(name_cell);

        const desc_cell = stack.readCell();
        const description = this.cell2str(desc_cell);

        const image_cell = stack.readCell();
        const image = this.cell2str(image_cell);

        const symbol_cell = stack.readCell();
        const symbol = this.cell2str(symbol_cell);

        const decimals = stack.readNumber();
        const protocol = stack.readNumber();
        const group_id = stack.readBigNumber();
        const group_owner = stack.readBigNumber();

        return { name, description, image, symbol, decimals, protocol, group_id, group_owner };
    }
    cell2str(c: Cell): string {
        return Buffer.from(c.toString().slice(2, -1), 'hex').toString();
    }
}
