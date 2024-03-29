import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { BJetton, BJettonConfig } from '../wrappers/BJetton';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { buildTokenMetadataCell } from '../wrappers/utils';

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

        const init_params = {
            name: 'Trinitas',
            description: ' God the Father, God the Son and God the Holy Spirit',
            image: 'https://en.wikipedia.org/wiki/Christian_cross#/media/File:Christian_cross.svg',
            symbol: 'TTT',
            decimal: '18',
            protocol: '1',
            group_id: '101',
            group_owner: '0',
        };

        content = buildTokenMetadataCell(init_params);

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
    it('should get data', async () => {
        const { supply, admin } = await bJetton.getJettonData();

        expect(supply).toEqual(0n);
        expect(admin).toEqualAddress(deployer.address);
    });
    it('should get wrapped token data', async () => {
        const { name, description, image, symbol, decimals, protocol, group_id, group_owner } =
            await bJetton.getJettonWrappedData();

        expect(name).toEqual('Trinitas');
        expect(symbol).toEqual('TTT');
        expect(decimals).toEqual(18);
        expect(protocol).toEqual(1);
        expect(group_id).toEqual(101n);
        expect(group_owner).toEqual(0n);
    });
});
