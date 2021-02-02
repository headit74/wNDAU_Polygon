const Web3 = require('web3');
const web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
const { expect } = require('chai');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const WNDAU = artifacts.require('wNDAU');
const MultiSigWallet = artifacts.require('MultiSigWalletMock');

describe('Testset for token properties', () => {
  const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
  let deployer;
  let signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8;
  let signer9, signer10, signer11, signer12, signer13, signer14, signer15;
  let user1, user2;

  let tokenWNDAU;
  let multisig;
  let snapshotId;
  let signersArr;

  before(async() => {
    [
      deployer,
      signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8,
      signer9, signer10, signer11, signer12, signer13, signer14, signer15,
      user1, user2
    ] = await web3.eth.getAccounts();
    signersArr = [signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8,
      signer9, signer10, signer11, signer12, signer13, signer14, signer15];

    multisig = await MultiSigWallet.new([signer1, signer2, signer3, signer4, signer5, signer6, signer7,
      signer8, signer9, signer10, signer11, signer12, signer13,
      signer14, signer15], { from: deployer });

    tokenWNDAU = await WNDAU.new(multisig.address, { from: deployer });

  });


  describe('Multisig creation', () => {
    beforeEach(async() => {
      // Create a snapshot
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];
    });

    afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Accounts from constructor are signers', async() => {
      for (let i = 0; i < signersArr.length; i++) {
        expect(await multisig.isSigner(signersArr[i])).to.be.true;
      }
    });

    it('Not listed accounts are not signers', async() => {
      expect(await multisig.isSigner(user1)).to.be.false;
    });

    it('No transactions for the new multisig', async() => {
      expect((await multisig.transactionCount()).toNumber()).to.equal(0);
    });

    it('Number of signers matches the constant', async() => {
      for (let i = 0; i < 15; i++) {
        expect(await multisig.signers(i)).to.equal(signersArr[i]);
      }
      await truffleAssert.fails(
        multisig.signers(15)
      );

      const sings = await multisig.getSigners();
      for (let i = 0; i < 15; i++) {
        expect(sings[i]).to.equal(signersArr[i]);
      }
    });

    it('Cannot create a multisig with incorrect signer address', async() => {
      ///Same signer1
      await truffleAssert.reverts(
        MultiSigWallet.new([signer1, signer1, signer3, signer4, signer5, signer6, signer7, signer8,
          signer9, signer10, signer11, signer12, signer13, signer14, signer15], { from: deployer }),
        'Signer already registered'
      );
      ///Null address
      await truffleAssert.reverts(
        MultiSigWallet.new([signer1, NULL_ADDRESS, signer3, signer4, signer5, signer6, signer7, signer8,
          signer9, signer10, signer11, signer12, signer13, signer14, signer15], { from: deployer }),
        'Zero address'
      );
      ///Incorrect length
      await truffleAssert.reverts(
        MultiSigWallet.new([signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8,
          signer9, signer10, signer11], { from: deployer }),
        'Incorrect signers number'
      );
      ///Incorrect length
      await truffleAssert.reverts(
        MultiSigWallet.new([signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8,
          signer9, signer10, signer11, signer12, signer13, signer14, signer15, user1], { from: deployer }),
        'Incorrect signers number'
      );

    });
  });

  describe('Token info', () => {
    it('Fails with incorrect multisisg address', async() => {
      await truffleAssert.reverts(
        WNDAU.new(NULL_ADDRESS, { from: deployer }),
        'Zero address'
      );
    });

    it('Correct name', async() => {
      expect(await tokenWNDAU.name()).to.equal('Wrapped NDAU');
    });

    it('Correct symbol', async() => {
      expect(await tokenWNDAU.symbol()).to.equal('wNDAU');
    });

    it('Correct decimals', async() => {
      expect((await tokenWNDAU.decimals()).toString()).to.equal('10');
    });

    it('No initial supply', async() => {
      expect((await tokenWNDAU.totalSupply()).toString()).to.equal('0');
    });
  });

  describe('Multisig replaceSigner()', () => {
    beforeEach(async() => {
      // Create a snapshot
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];
    });

    afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Only multisig can call the replaceSigner()', async() => {
      await truffleAssert.reverts(
        multisig.replaceSigner(signer1, user1, { from: user1 }),
        'Not multisig'
      );

      await truffleAssert.reverts(
        multisig.replaceSigner(signer1, user1, { from: signer1 }),
        'Not multisig'
      );

      await truffleAssert.passes(
        multisig.replaceSignerMock(signer1, user1, { from: deployer })
      );

    });
    it('Incorrect addresses for replaceSigner()', async() => {
      await truffleAssert.reverts(
        multisig.replaceSignerMock(NULL_ADDRESS, user1, { from: deployer }),
        'Is not a signer'
      );
      await truffleAssert.reverts(
        multisig.replaceSignerMock(user2, user1, { from: deployer }),
        'Is not a signer'
      );
      await truffleAssert.reverts(
        multisig.replaceSignerMock(signer1, signer2, { from: deployer }),
        'Already a signer'
      );
      await truffleAssert.reverts(
        multisig.replaceSignerMock(signer1, NULL_ADDRESS, { from: deployer }),
        'Zero address'
      );
    });

    it('Successful replaceSigner()', async() => {
      truffleAssert.eventEmitted(
        await multisig.replaceSignerMock(signer1, user1, { from: deployer }),
        'SignerChanged',
        {
          previousSigner: signer1,
          newSigner: user1
        }
      );

      expect(await multisig.isSigner(signer1)).to.be.false;
      expect(await multisig.isSigner(user1)).to.be.true;
      expect(await multisig.signers(0)).to.equal(user1);
    });

  });

  describe('Multisig submitTransaction()', () => {
    let replaceSignerEncoded;

    before(async() => {
      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer1, user1).encodeABI();
    });
    beforeEach(async() => {
      // Create a snapshot
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];
    });

    afterEach(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Only signers can call the submitTransaction()', async() => {
      await truffleAssert.fails(
        multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: user1 }),
        'Is not a signer'
      );
    });

    it('Incorrect addresses for submitTransaction()', async() => {
      await truffleAssert.reverts(
        multisig.submitTransaction(NULL_ADDRESS, 0, replaceSignerEncoded, { from: signer1 }),
        'Zero address'
      );
    });

    it('Successful submitTransaction()', async() => {
      truffleAssert.eventEmitted(
        await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 }),
        'TxSubmitted', (ev) => ev.signer === signer1 && ev.transactionId.toString() === '0'
      );

      expect((await multisig.transactionCount()).toNumber()).to.equal(1);

      const tr = await multisig.transactions(0);
      expect(tr.destination).to.equal(multisig.address);
      expect(tr.value.toNumber()).to.equal(0);
      expect(tr.data).to.equal(replaceSignerEncoded);
      expect(tr.executed).to.be.false;
    });

    it('Transaction confirmed after submitTransaction()', async() => {
      truffleAssert.eventEmitted(
        await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 }),
        'TxConfirmed', (ev) => ev.signer === signer1 && ev.transactionId.toString() === '0'
      );

      expect((await multisig.transactionCount()).toNumber()).to.equal(1);

      expect(await multisig.confirmations(0, signer1)).to.be.true;
    });
  });

  describe('Multisig confirmTransaction()', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer1, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Only signers can call the confirmTransaction()', async() => {
      await truffleAssert.fails(
        multisig.confirmTransaction(0, { from: user1 }),
        'Is not a signer'
      );
    });

    it('Incorrect transaction id', async() => {
      await truffleAssert.reverts(
        multisig.confirmTransaction(1, { from: signer1 }),
        'Incorrect id'
      );
    });

    it('Cannot confirm already confirmed', async() => {
      await truffleAssert.fails(
        multisig.confirmTransaction(0, { from: signer1 }),
        'Already confirmed'
      );
    });

    it('Successful confirmTransaction()', async() => {
      expect(await multisig.confirmations(0, signer2)).to.be.false;
      truffleAssert.eventEmitted(
        await multisig.confirmTransaction(0, { from: signer2 }),
        'TxConfirmed', (ev) => ev.signer === signer2 && ev.transactionId.toString() === '0'
      );

      expect(await multisig.confirmations(0, signer2)).to.be.true;
    });

  });

  describe('Multisig revokeConfirmation()', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer1, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
      await multisig.confirmTransaction(0, { from: signer2 });
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Only signers can call the revokeConfirmation()', async() => {
      await truffleAssert.fails(
        multisig.revokeConfirmation(0, { from: user1 }),
        'Is not a signer'
      );
    });

    it('Incorrect transaction id', async() => {
      await truffleAssert.fails(
        multisig.revokeConfirmation(3, { from: signer1 }),
        'Incorrect id'
      );
    });

    it('Cannot revoke not confirmed', async() => {
      await truffleAssert.fails(
        multisig.revokeConfirmation(0, { from: signer3 }),
        'Not confirmed'
      );
    });

    it('Successful revokeConfirmation()', async() => {
      expect(await multisig.confirmations(0, signer2)).to.be.true;
      truffleAssert.eventEmitted(
        await multisig.revokeConfirmation(0, { from: signer2 }),
        'TxConfirmationRevoked', (ev) => ev.signer === signer2 && ev.transactionId.toString() === '0'
      );

      expect(await multisig.confirmations(0, signer2)).to.be.false;
    });

  });

  describe('The last signer executes transaction', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer1, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
      await multisig.confirmTransaction(0, { from: signer2 });
      await multisig.confirmTransaction(0, { from: signer3 });
      await multisig.confirmTransaction(0, { from: signer4 });

    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('The last signer executes transaction', async() => {
      expect((await multisig.transactions(0)).executed).to.be.false;
      truffleAssert.eventEmitted(
        await multisig.confirmTransaction(0, { from: signer5 }),
        'TxExecuted', (ev) => ev.transactionId.toString() === '0'
      );

      expect((await multisig.transactions(0)).executed).to.be.true;
      ///Check transacton result
      expect(await multisig.isSigner(signer1)).to.be.false;
      expect(await multisig.isSigner(user1)).to.be.true;
      expect(await multisig.signers(0)).to.equal(user1);
    });

  });

  describe('Failed transaction handling', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer10, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
      ///Second tx should fail
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
      await multisig.confirmTransaction(0, { from: signer2 });
      await multisig.confirmTransaction(0, { from: signer3 });
      await multisig.confirmTransaction(0, { from: signer4 });
      await multisig.confirmTransaction(0, { from: signer5 });


      await multisig.confirmTransaction(1, { from: signer2 });
      await multisig.confirmTransaction(1, { from: signer3 });
      await multisig.confirmTransaction(1, { from: signer4 });
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Failed transaction handling', async() => {
      truffleAssert.eventEmitted(
        await multisig.confirmTransaction(1, { from: signer5 }),
        'TxExecutionFailed', (ev) => ev.transactionId.toString() === '1'
      );

      expect((await multisig.transactions(1)).executed).to.be.false;
      expect(await multisig.confirmations(1, signer5)).to.be.true;
      expect(await multisig.isConfirmed(1)).to.be.true;
    });

  });


  describe('Test confirmations', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer10, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Test confirmations', async() => {
      let confs = await multisig.getConfirmations(0);
      expect(confs.length).to.equal(1);
      expect(confs[0]).to.equal(signer1);

      expect(await multisig.confirmations(0, signer1)).to.be.true;
      expect((await multisig.getConfirmationCount(0)).toNumber()).to.equal(1);
      expect(await multisig.isConfirmed(0)).to.be.false;

      await multisig.confirmTransaction(0, { from: signer2 });

      confs = await multisig.getConfirmations(0);
      expect(confs.length).to.equal(2);
      expect(confs[1]).to.equal(signer2);

      expect(await multisig.confirmations(0, signer2)).to.be.true;
      expect((await multisig.getConfirmationCount(0)).toNumber()).to.equal(2);
      expect(await multisig.isConfirmed(0)).to.be.false;

      await multisig.confirmTransaction(0, { from: signer3 });

      confs = await multisig.getConfirmations(0);
      expect(confs.length).to.equal(3);
      expect(confs[2]).to.equal(signer3);

      expect(await multisig.confirmations(0, signer3)).to.be.true;
      expect((await multisig.getConfirmationCount(0)).toNumber()).to.equal(3);
      expect(await multisig.isConfirmed(0)).to.be.false;

      await multisig.confirmTransaction(0, { from: signer4 });

      confs = await multisig.getConfirmations(0);
      expect(confs.length).to.equal(4);
      expect(confs[3]).to.equal(signer4);

      expect(await multisig.confirmations(0, signer4)).to.be.true;
      expect((await multisig.getConfirmationCount(0)).toNumber()).to.equal(4);
      expect(await multisig.isConfirmed(0)).to.be.false;

      await multisig.confirmTransaction(0, { from: signer5 });

      confs = await multisig.getConfirmations(0);
      expect(confs.length).to.equal(5);
      expect(confs[4]).to.equal(signer5);

      expect(await multisig.confirmations(0, signer5)).to.be.true;
      expect((await multisig.getConfirmationCount(0)).toNumber()).to.equal(5);
      expect(await multisig.isConfirmed(0)).to.be.true;
    });

  });

  describe('Pending transactions', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer10, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer2 });
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer3 });
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer4 });
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer5 });
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Pending transactions', async() => {
      expect((await multisig.getPendingTransactionCount()).toNumber()).to.equal(5);

      let txs = await multisig.getPendingTransactionIds(0, 10);
      expect(txs.length).to.equal(5);

      txs = await multisig.getPendingTransactionIds(2, 4);
      expect(txs.length).to.equal(2);

    });
    it('Will not execute pending tx', async() => {
      await multisig.executeTransaction(0, { from: signer1 });

      expect((await multisig.transactions(0)).executed).to.be.false;

    });
  });

  describe('Cannot confirm or revoke or execute executed transaction', () => {
    let replaceSignerEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer1, user1).encodeABI();
      await multisig.submitTransaction(multisig.address, 0, replaceSignerEncoded, { from: signer1 });
      await multisig.confirmTransaction(0, { from: signer2 });
      await multisig.confirmTransaction(0, { from: signer3 });
      await multisig.confirmTransaction(0, { from: signer4 });
      await multisig.confirmTransaction(0, { from: signer5 });

    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Nothing to do with executed transaction', async() => {
      await truffleAssert.reverts(
        multisig.executeTransaction(0, { from: signer5 }),
        'Already executed'
      );

      await truffleAssert.reverts(
        multisig.confirmTransaction(0, { from: signer6 }),
        'Already executed'
      );

      await truffleAssert.reverts(
        multisig.revokeConfirmation(0, { from: signer5 }),
        'Already executed'
      );
    });

  });

  describe('Handle payments', () => {

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Payment flow', async() => {
      expect(await web3.eth.getBalance(multisig.address)).to.equal('0');
      truffleAssert.eventEmitted(
        await multisig.send(100, { from: signer1 }),
        'Deposit', (ev) => ev.signer === signer1 && ev.value.toString() === '100'
      );

      expect(await web3.eth.getBalance(multisig.address)).to.equal('100');

      truffleAssert.eventEmitted(
        await multisig.returnDepositMock(signer1, 100, { from: signer5 }),
        'Withdraw', (ev) => ev.recepient === signer1 && ev.value.toString() === '100'
      );

      expect(await web3.eth.getBalance(multisig.address)).to.equal('0');
    });

    it('Only signers can be recepients', async() => {
      await truffleAssert.fails(
        multisig.returnDepositMock(user1, 100, { from: signer1 }),
        'Is not a signer'
      );
    });

    it('Incorrect amount', async() => {
      await truffleAssert.reverts(
        multisig.returnDepositMock(signer1, 1000, { from: signer1 }),
        'Incorrect amount'
      );
    });

    it('Only multsig', async() => {
      await truffleAssert.fails(
        multisig.returnDeposit(signer1, 3, { from: signer1 }),
        'Not multisig'
      );
    });

  });



  describe('Multisig for token', () => {
    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Only by multisig', async() => {
      await truffleAssert.fails(
        tokenWNDAU.mintFor(user1, 100, { from: signer1 }),
        'Only multisigned'
      );

      await truffleAssert.passes(
        multisig.callToken(tokenWNDAU.address, user1, 100, { from: signer1 })
      );

      expect((await tokenWNDAU.balanceOf(user1)).toNumber()).to.equal(100);
      expect((await tokenWNDAU.totalSupply()).toNumber()).to.equal(100);
    });

    it('Only correct addresses', async() => {
      await truffleAssert.reverts(
        multisig.callToken(tokenWNDAU.address, NULL_ADDRESS, 100, { from: signer1 }),
        'Zero address'
      );

      await truffleAssert.reverts(
        multisig.callToken(tokenWNDAU.address, tokenWNDAU.address, 100, { from: signer1 }),
        'Incorrect address'
      );
    });

    it('Only correct amount', async() => {
      await truffleAssert.reverts(
        multisig.callToken(tokenWNDAU.address, user1, 0, { from: signer1 }),
        'Incorrect amount'
      );
    });

  });

  describe('Multisig mint', () => {
    let mintForEncoded;

    before(async() => {
      const snapshot = await timeMachine.takeSnapshot();
      snapshotId = snapshot['result'];

      mintForEncoded = tokenWNDAU.contract.methods.mintFor(user1, 10000).encodeABI();

      await multisig.submitTransaction(tokenWNDAU.address, 0, mintForEncoded, { from: signer1 });
      await multisig.confirmTransaction(0, { from: signer2 });
      await multisig.confirmTransaction(0, { from: signer3 });
      await multisig.confirmTransaction(0, { from: signer4 });
    });

    after(async() => await timeMachine.revertToSnapshot(snapshotId));

    it('Multisig mint', async() => {
      expect((await tokenWNDAU.balanceOf(user1)).toNumber()).to.equal(0);
      expect((await tokenWNDAU.totalSupply()).toNumber()).to.equal(0);

      await multisig.confirmTransaction(0, { from: signer5 });

      expect((await tokenWNDAU.balanceOf(user1)).toNumber()).to.equal(10000);
      expect((await tokenWNDAU.totalSupply()).toNumber()).to.equal(10000);
    });

  });

});

//let replaceSignerEncoded = multisig.contract.methods.replaceSigner(signer1, user1).encodeABI();
//let mintForEncoded = tokenWNDAU.contract.methods.mintFor(user1, 10000).encodeABI();
