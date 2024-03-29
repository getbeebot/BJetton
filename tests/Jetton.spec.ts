import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildTokenMetadata, parseTokenMetadata } from '../wrappers/utils';

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

    const tg_info = {
        protocol: 'tg_group',
        group_id: 101,
        group_owner: 0,
    };

    const token_metadata = {
        name: 'Trinitas',
        description: ' God the Father, God the Son and God the Holy Spirit',
        image: 'https://en.wikipedia.org/wiki/Christian_cross#/media/File:Christian_cross.svg',
        symbol: 'TTT',
        decimal: '18',
        extends: JSON.stringify(tg_info),
    };

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        content = await buildTokenMetadata(token_metadata);

        deployer = await blockchain.treasury('deployer');

        init_data = {
            admin_address: deployer.address,
            content: content,
            jetton_wallet_code: wallet_code,
        };

        bJetton = blockchain.openContract(BJetton.createFromConfig(init_data, code));

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

    it('should get jetton data', async () => {
        const { supply, admin, content } = await bJetton.getJettonData();

        const metadata = await parseTokenMetadata(content);
        console.log(metadata);

        expect(supply).toEqual(0n);
        expect(admin).toEqualAddress(deployer.address);
        expect(metadata).toEqual(token_metadata);
    });
});
