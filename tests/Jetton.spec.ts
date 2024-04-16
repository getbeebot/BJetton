import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, beginCell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildTokenMetadata, parseTokenMetadata, JETTON_WALLET_CODE } from '../wrappers/utils';
import { StakingPool, StakingPoolConfig } from '../wrappers/StakingPool';
import { Jetton } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';

describe('StakingPool', () => {
    let staking_pool_code: Cell;
    let jetton_master_code: Cell;
    let jetton_wallet_code: Cell;

    beforeAll(async () => {
        staking_pool_code = await compile('StakingPool');
        jetton_master_code = await compile('BJetton');
        jetton_wallet_code = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let staking_pool: SandboxContract<StakingPool>;
    let jetton: SandboxContract<Jetton>;
    let jetton_wallet: SandboxContract<JettonWallet>;
    let pool_wallet: SandboxContract<JettonWallet>;
    let init_data: StakingPoolConfig;

    const token_metadata = {
        name: 'Banana',
        description: 'Banana!!!',
        image: 'ipfs://QmRBUx9UbfrMLAK75tXTvcFUqG2duLihVR4PWpVuBUSuPz',
        symbol: 'BNA',
        decimals: '9',
    };

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // blockchain.verbosity = {
        //     blockchainLogs: true,
        //     vmLogs: 'vm_logs_verbose',
        //     debugLogs: true,
        //     print: true,
        // };

        deployer = await blockchain.treasury('deployer');

        // Jetton
        const content = await buildTokenMetadata(token_metadata);
        const data = {
            admin_address: deployer.address,
            content: content,
            jetton_wallet_code: jetton_wallet_code,
        };
        jetton = blockchain.openContract(Jetton.createFromConfig(data, jetton_master_code));
        const jetton_deploy = await jetton.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(jetton_deploy.transactions).toHaveTransaction({
            from: deployer.address,
            to: jetton.address,
            deploy: true,
            success: true,
        });

        // JettonWallet for deployer
        const jw_config = {
            balance: 0n,
            owner_address: deployer.address,
            jetton_master_address: jetton.address,
            jetton_wallet_code: jetton_wallet_code,
        };
        jetton_wallet = blockchain.openContract(JettonWallet.createFromConfig(jw_config, jetton_wallet_code));
        const jw_deploy = await jetton_wallet.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(jw_deploy.transactions).toHaveTransaction({
            from: deployer.address,
            to: jetton_wallet.address,
            deploy: true,
            success: true,
        });

        // Staking Pool
        const op1 = deployer.address;
        const op2 = Address.parse('UQBJev-cGiUhjbDKAlJ56VoWy5JjCnYNmqVOMgYB1qkS0eiq');

        const oneforalone = Address.parse('UQBJev-cGiUhjbDKAlJ56VoWy5JjCnYNmqVOMgYB1qkS0eiq');

        let ops = beginCell().storeAddress(op1).storeAddress(op2).endCell();
        init_data = {
            community: deployer.address,
            jetton_master: deployer.address, // need to change to jetton master address
            ops: ops,
        };

        staking_pool = blockchain.openContract(StakingPool.createFromConfig(init_data, staking_pool_code));

        const deployResult = await staking_pool.sendDeploy(deployer.getSender(), toNano('1'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: staking_pool.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and staking pool are ready to use
    });

    it('should get staking pool data', async () => {
        let amount = await staking_pool.getStakingAmount();
        expect(amount).toEqual(0n);

        let community = await staking_pool.getCommunity();
        expect(community.toString()).toEqual(deployer.address.toString());
    });

    it('should stake after mint/transfer', async () => {
        let total_supply = await jetton.getTotalSupply();
        let staking_amount = await staking_pool.getStakingAmount();

        let amount = toNano('21000000');
        await jetton.sendMint(deployer.getSender(), staking_pool.address, amount, toNano('0.05'), toNano('0.1'));

        total_supply = await jetton.getTotalSupply();
        staking_amount = await staking_pool.getStakingAmount();

        expect(staking_amount).toEqual(amount);
    });

    it('should claim from staking pool', async () => {
        let staking_amount = await staking_pool.getStakingAmount();
        expect(staking_amount).toEqual(0n);

        const amount = toNano('1000000');
        await jetton.sendMint(deployer.getSender(), staking_pool.address, amount, toNano('0.05'), toNano('0.1'));

        staking_amount = await staking_pool.getStakingAmount();
        expect(staking_amount).toEqual(amount);

        const pool_wallet_address = await jetton.getWalletAddress(staking_pool.address);
        pool_wallet = blockchain.openContract(JettonWallet.createFromAddress(pool_wallet_address));

        const reward_amount = toNano('1000');

        await staking_pool.sendClaim(
            deployer.getSender(),
            pool_wallet.address,
            deployer.address,
            reward_amount,
            toNano('0.05'),
            toNano('0.1'),
        );

        staking_amount = await staking_pool.getStakingAmount();
        expect(staking_amount).toEqual(amount - reward_amount);

        const pool_balance = await pool_wallet.getBalance();
        expect(pool_balance).toEqual(amount - reward_amount);

        const balance = await jetton_wallet.getBalance();
        expect(balance).toEqual(reward_amount);
    });

    it('should drain all staking jetton', async () => {
        let staking_amount = await staking_pool.getStakingAmount();
        expect(staking_amount).toEqual(0n);

        const amount = toNano('1000000');
        await jetton.sendMint(deployer.getSender(), staking_pool.address, amount, toNano('0.05'), toNano('0.1'));

        staking_amount = await staking_pool.getStakingAmount();
        expect(staking_amount).toEqual(amount);

        const pool_wallet_address = await jetton.getWalletAddress(staking_pool.address);
        pool_wallet = blockchain.openContract(JettonWallet.createFromAddress(pool_wallet_address));

        const total_ton_amt = toNano('0.05');
        const fwd_ton_fee = toNano('0.05'); // forward ton amount should be less than 0.07 ton
        await staking_pool.sendDrain(deployer.getSender(), pool_wallet_address, total_ton_amt, fwd_ton_fee);

        staking_amount = await staking_pool.getStakingAmount();
        expect(staking_amount).toEqual(0n);

        const pool_balance = await pool_wallet.getBalance();
        expect(pool_balance).toEqual(0n);

        const balance = await jetton_wallet.getBalance();
        expect(balance).toEqual(amount);
    });
});
