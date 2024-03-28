import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('BJetton', () => {
    let code: Cell;
    let wallet_code: Cell;

    beforeAll(async () => {
        code = await compile('BJetton');
        wallet_code = await compile('BJettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bJetton: SandboxContract<BJetton>;
    let init_data: BJettonConfig;
    let content: Cell;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // TODO: initial data for jetton
        content = beginCell().endCell();

        init_data = {
            total_supply: 21_000_000n,
            admin_address: deployer.address,
            content: content,
            jetton_wallet_code: wallet_code,
        };

        bJetton = blockchain.openContract(BJetton.createFromConfig(init_data, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await bJetton.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bJetton.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and bJetton are ready to use
    });
});
