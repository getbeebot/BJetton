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
import { Op as OP } from './JettonConstants';

export type StakingPoolConfig = {
    community: Address;
    jetton_master: Address;
    ops: Cell;
};

export function StakingPoolConfigToCell(config: StakingPoolConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.community)
        .storeAddress(config.jetton_master)
        .storeRef(config.ops)
        .endCell();
}

export class StakingPool implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new StakingPool(address);
    }

    static createFromConfig(config: StakingPoolConfig, code: Cell, workchain = 0) {
        const data = StakingPoolConfigToCell(config);
        const init = { code, data };
        return new StakingPool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    static stakeMessage(jetton_amt: bigint, query_id: number | bigint = 0) {
        return beginCell()
            .storeUint(OP.transfer_notification, 32)
            .storeUint(query_id, 64)
            .storeCoins(jetton_amt)
            .endCell();
    }
    async sendStake(provider: ContractProvider, via: Sender, jetton_amt: bigint) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: StakingPool.stakeMessage(jetton_amt),
            value: toNano('0.05'),
        });
    }

    static claimMessage(
        from: Address,
        to: Address,
        pool_wallet: Address,
        jetton_amt: bigint,
        forward_ton_amount: bigint,
        total_ton_amount: bigint,
        query_id: number | bigint = 0,
    ) {
        const jetton_msg_body = beginCell()
            .storeUint(OP.transfer, 32)
            .storeUint(0, 64) // query_id
            .storeCoins(jetton_amt)
            .storeAddress(to)
            .storeAddress(from)
            .storeMaybeRef(null)
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(null)
            .endCell();

        return beginCell()
            .storeUint(OP.claim, 32)
            .storeUint(query_id, 64)
            .storeAddress(pool_wallet)
            .storeCoins(total_ton_amount)
            .storeCoins(jetton_amt)
            .storeRef(jetton_msg_body)
            .endCell();
    }
    async sendClaim(
        provider: ContractProvider,
        via: Sender,
        pool_wallet: Address,
        to: Address,
        jetton_amt: bigint,
        forward_ton_amt: bigint,
        total_ton_amt: bigint,
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: StakingPool.claimMessage(this.address, to, pool_wallet, jetton_amt, forward_ton_amt, total_ton_amt),
            value: total_ton_amt + toNano('0.015'),
        });
    }

    static drainMessage(
        pool_wallet: Address,
        total_ton_amt: bigint,
        forward_ton_amt: bigint,
        query_id: number | bigint = 0,
    ) {
        return beginCell()
            .storeUint(OP.drain, 32)
            .storeUint(query_id, 64)
            .storeAddress(pool_wallet)
            .storeCoins(total_ton_amt)
            .storeCoins(forward_ton_amt)
            .endCell();
    }
    async sendDrain(
        provider: ContractProvider,
        via: Sender,
        pool_wallet: Address,
        total_ton_amt: bigint,
        forward_ton_amt: bigint,
    ) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: StakingPool.drainMessage(pool_wallet, total_ton_amt, forward_ton_amt),
            value: total_ton_amt + toNano('0.015'),
        });
    }

    async getPoolData(provider: ContractProvider) {
        const { stack } = await provider.get('get_pool_data', []);
        const amount = stack.readBigNumber();
        const community = stack.readAddress();
        const jetton_master = stack.readAddress();
        const ops_cell = stack.readCell();
        const ops_slice = ops_cell.beginParse();
        const op1 = ops_slice.loadAddress();
        const op2 = ops_slice.loadAddress();

        return { amount, community, jetton_master, op1, op2 };
    }

    async getStakingAmount(provider: ContractProvider) {
        const { amount } = await this.getPoolData(provider);
        return amount;
    }

    async getCommunity(provider: ContractProvider) {
        const { community } = await this.getPoolData(provider);
        return community;
    }

    async getJettonMaster(provider: ContractProvider) {
        const { jetton_master } = await this.getPoolData(provider);
        return jetton_master;
    }

    async getOps(provider: ContractProvider) {
        const { op1, op2 } = await this.getPoolData(provider);
        return [op1, op2];
    }
}
