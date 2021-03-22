import { ChainId } from '@uniswap/sdk'
import { BigNumber } from '@ethersproject/bignumber'

export interface CallListeners {
  // on a per-chain basis
  [chainId: number]: {
    // stores for each call key the listeners' preferences
    [callKey: string]: {
      // stores how many listeners there are per each blocks per fetch preference
      [blocksPerFetch: number]: number
    }
  }
}

export interface SerializableTransactionReceipt {
  to: string
  from: string
  contractAddress: string
  transactionIndex: number
  blockHash: string
  transactionHash: string
  blockNumber: number
  status?: number
}
export interface TransactionDetails {
  hash: string
  approval?: { tokenAddress: string; spender: string }
  summary?: string
  claim?: { recipient: string }
  receipt?: SerializableTransactionReceipt
  lastCheckedBlockNumber?: number
  addedTime: number
  confirmedTime?: number
  from: string
}
export type MethodArg = string | number | BigNumber
export type OptionalMethodInputs = Array<MethodArg | MethodArg[] | undefined> | undefined
export const INVALID_RESULT: CallResult = { valid: false, blockNumber: undefined, data: undefined }

export interface Result extends ReadonlyArray<any> {
  readonly [key: string]: any
}
export interface ListenerOptions {
  // how often this data should be fetched, by default 1
  readonly blocksPerFetch?: number
}

export interface CallState {
  readonly valid: boolean
  // the result, or undefined if loading or errored/no data
  readonly result: Result | undefined
  // true if the result has never been fetched
  readonly loading: boolean
  // true if the result is not for the latest block
  readonly syncing: boolean
  // true if the call was made and is synced, but the return data is invalid
  readonly error: boolean
}

export interface Call {
  address: string
  callData: string
}
export interface CallResult {
  readonly valid: boolean
  readonly data: string | undefined
  readonly blockNumber: number | undefined
}
export interface TransactionState {
  [chainId: number]: {
    [txHash: string]: TransactionDetails
  }
}
export interface CallResults {
  [chainId: number]: {
    [callKey: string]: {
      data?: string | null
      blockNumber?: number
      fetchingBlockNumber?: number
    }
  }
}
export interface IWeb3StatusState {
  application: {
    modalOpen: boolean
    blockNumber: { [chainId: number]: number }
  }
  multicall: {
    callListeners?: CallListeners
    callResults: CallResults
  }
  transactions: TransactionState
}
export type ApplicationAction =
  | {
      type: 'TOGGLE_MODAL'
    }
  | {
      type: 'NETWORK_ERROR'
      payload: {
        error: string | Error
      }
    }
  | {
      type: 'ADD_MULTICALL_LISTENER'
      payload: ListenerProps
    }
  | {
      type: 'REMOVE_MULTICALL_LISTENER'
      payload: ListenerProps
    }
  | {
      type: 'FETCH_MULTICALL_LISTENER'
      payload: FetchingProps
    }
  | {
      type: 'ERROR_FETCH_MULTICALL_LISTENER'
      payload: FetchingProps
    }
  | {
      type: 'UPDATE_MULTICALL_LISTENER'
      payload: ResultProps
    }
  | {
      type: 'UPDATE_BLOCK_NUMBER'
      payload: UpdateBlockNumberPayload
    }
  | {
      type: 'ADD_TRANSACTION'
      payload: AddTransactionPayload
    }
  | {
      type: 'CHECKED_TRANSACTION'
      payload: CheckedTransactionPayload
    }
  | {
      type: 'CLEAR_ALL_TRANSACTIONS'
      payload: { chainId: number }
    }
  | {
      type: 'FINALIZE_TRANSACTION'
      payload: FinalizeTransaction
    }

export interface ListenerProps {
  chainId: ChainId | undefined
  calls: Call[]
  options: any
}
export interface FetchingProps {
  chainId: ChainId | undefined
  calls: Call[]
  fetchingBlockNumber: number
}
export interface ResultProps {
  chainId: ChainId | undefined
  results: any
  blockNumber: number
}
export interface UpdateBlockNumberPayload {
  chainId: number | undefined
  blockNumber: number
}
export interface AddTransactionPayload {
  chainId: number
  from: string
  hash: string
  approval?: { tokenAddress: string; spender: string }
  summary: string
  claim?: { recipient: string }
}
export interface CheckedTransactionPayload {
  chainId: number
  hash: string
  blockNumber: ChainId
}
export interface FinalizeTransaction {
  chainId: number
  hash: string
  receipt: SerializableTransactionReceipt
}