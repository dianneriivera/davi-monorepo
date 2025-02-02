import moment from 'moment';
import { preventEmptyString } from 'utils';
import { Call } from 'components/ActionsBuilder/types';
import { decodeCall } from 'hooks/Guilds/contracts/useDecodedCall';
import { RichContractData } from 'hooks/Guilds/contracts/useRichContractRegistry';
import { ZERO_HASH } from './constants';

export const encodeRepMint = (library, repAmount, to, avatar) => {
  const repFunctionEncoded = library.eth.abi.encodeFunctionSignature(
    'mintReputation(uint256,address,address)'
  );

  const repParamsEncoded = library.eth.abi
    .encodeParameters(
      ['uint256', 'address', 'address'],
      [repAmount, to, avatar]
    )
    .substring(2);

  return repFunctionEncoded + repParamsEncoded;
};

export const encodeErc20Approval = (library, to, amount) => {
  const erc20ApprovalFunctionEncoded = library.eth.abi.encodeFunctionSignature(
    'approve(address,uint256)'
  );

  const erc20ApprovalParamsEncoded = library.eth.abi
    .encodeParameters(['address', 'uint256'], [to, amount])
    .substring(2);

  return erc20ApprovalFunctionEncoded + erc20ApprovalParamsEncoded;
};
export const encodeErc20Transfer = (library, to, amount) => {
  const erc20TransferFunctionEncoded = library.eth.abi.encodeFunctionSignature(
    'transfer(address,uint256)'
  );

  const erc20TransferParamsEncoded = library.eth.abi
    .encodeParameters(['address', 'uint256'], [to, amount])
    .substring(2);

  return erc20TransferFunctionEncoded + erc20TransferParamsEncoded;
};

export const encodeDxdVestingCreate = (library, to, dxdAmount, start) => {
  const vestingFunctionEncoded = library.eth.abi.encodeFunctionSignature(
    'create(address,uint256,uint256,uint256,uint256)'
  );

  const vestingParamsEncoded = library.eth.abi
    .encodeParameters(
      ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
      [
        to,
        start.unix(),
        moment.duration(1, 'years').asSeconds(),
        moment.duration(3, 'years').asSeconds(),
        dxdAmount,
      ]
    )
    .substring(2);

  return vestingFunctionEncoded + vestingParamsEncoded;
};

export const encodeDxdVestingRelease = (library, token) => {
  const vestingFunctionEncoded =
    library.eth.abi.encodeFunctionSignature('release(address)');

  const vestingParamsEncoded = library.eth.abi
    .encodeParameters(['address'], [token])
    .substring(2);

  return vestingFunctionEncoded + vestingParamsEncoded;
};

export const encodeActions = async (
  calls: Call[],
  contracts: RichContractData[],
  chainId: number
) => {
  const isZeroHash = (data: string) => data === ZERO_HASH;

  const filteredCalls = calls.filter(
    call => !isZeroHash(call?.data) || !preventEmptyString(call?.value).isZero()
  );

  const encodedActions = await Promise.all(
    filteredCalls.map(async (call: Call) => {
      if (!!call?.approvalCall) {
        // If current call is an "spending" call will have a inner approvalCall
        const { decodedCall: decodedApprovalCall } = await decodeCall(
          call?.approvalCall,
          contracts,
          chainId
        );
        // Avoid spreading unnecesary approvalCall;
        const { approvalCall, ...newCall } = call;

        return {
          ...newCall,
          approval: {
            ...decodedApprovalCall,
            amount: decodedApprovalCall?.args?._value,
            token: decodedApprovalCall?.to,
          },
        };
      }
      return call;
    })
  );

  return encodedActions;
};
