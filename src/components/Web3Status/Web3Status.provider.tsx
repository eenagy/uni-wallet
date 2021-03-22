import React, { createContext, useMemo, ReactNode, useReducer } from 'react'
import { toCallKey } from './utils'
import {
  ListenerProps,
  FetchingProps,
  ResultProps,
  UpdateBlockNumberPayload,
  IWeb3StatusState,
  ApplicationAction,
  Call,
  FinalizeTransaction,
  AddTransactionPayload,
  CheckedTransactionPayload
} from './types'

export const stateInitialValue: IWeb3StatusState = {
  application: {
    modalOpen: false,
    blockNumber: {},
  },
  multicall: { callResults: {} },
  transactions: {},
}
const actionsIntialValue = {
  toggleModal: () => {},
  addMulticallListeners: (_: ListenerProps) => {},
  removeMulticallListeners: (_: ListenerProps) => {},
  fetchingMulticallResults: (_: FetchingProps) => {},
  errorFetchingMulticallResults: (_: FetchingProps) => {},
  updateMulticallResults: (_: ResultProps) => {},
  updateBlockNumber: (_: UpdateBlockNumberPayload) => {},
  checkedTransaction: (_: CheckedTransactionPayload) => {},
  addTransaction: (_: AddTransactionPayload) => {},
  finalizeTransaction: (_: FinalizeTransaction) => {},
  clearAllTransactions: (_: { chainId: number }) => {},
}

export const Web3StatusState = createContext(stateInitialValue)
export const Web3StatusActions = createContext(actionsIntialValue)

const now = () => new Date().getTime()

export const Web3StatusProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(
    (state: IWeb3StatusState, action: ApplicationAction) => {
      switch (action.type) {
        case 'TOGGLE_MODAL': {
          return {
            ...state,
            application: {
              ...state.application,
              modalOpen: !state.application.modalOpen,
            },
          }
        }
        case 'ADD_MULTICALL_LISTENER': {
          const {
            calls,
            chainId,
            options: { blocksPerFetch = 1 },
          } = action.payload
          const listeners = state.multicall.callListeners
            ? state.multicall.callListeners
            : (state.multicall.callListeners = {})
          if (chainId) {
            listeners[chainId] = listeners[chainId] ?? {}
            calls.forEach((call: Call) => {
              const callKey = toCallKey(call)
              listeners[chainId][callKey] = listeners[chainId][callKey] ?? {}
              listeners[chainId][callKey][blocksPerFetch] = (listeners[chainId][callKey][blocksPerFetch] ?? 0) + 1
            })
          }
          return state
        }
        case 'REMOVE_MULTICALL_LISTENER': {
          const {
            calls,
            chainId,
            options: { blocksPerFetch = 1 },
          } = action.payload
          const listeners = state.multicall.callListeners
            ? state.multicall.callListeners
            : (state.multicall.callListeners = {})
          if (chainId && listeners[chainId]) {
            listeners[chainId] = listeners[chainId] ?? {}
            calls.forEach((call: Call) => {
              const callKey = toCallKey(call)
              if (!listeners[chainId][callKey]) return
              if (!listeners[chainId][callKey][blocksPerFetch]) return

              if (listeners[chainId][callKey][blocksPerFetch] === 1) {
                delete listeners[chainId][callKey][blocksPerFetch]
              } else {
                listeners[chainId][callKey][blocksPerFetch]--
              }
            })
          }
          return state
        }
        case 'FETCH_MULTICALL_LISTENER': {
          const { fetchingBlockNumber, chainId, calls } = action.payload
          if (chainId) {
            state.multicall.callResults[chainId] = state.multicall.callResults[chainId] ?? {}
            calls.forEach((call) => {
              const callKey = toCallKey(call)
              const current = state.multicall.callResults[chainId][callKey]
              if (!current) {
                state.multicall.callResults[chainId][callKey] = {
                  fetchingBlockNumber,
                }
              } else {
                if ((current.fetchingBlockNumber ?? 0) >= fetchingBlockNumber) return
                state.multicall.callResults[chainId][callKey].fetchingBlockNumber = fetchingBlockNumber
              }
            })
          }

          return state
        }
        case 'ERROR_FETCH_MULTICALL_LISTENER': {
          const { fetchingBlockNumber, chainId, calls } = action.payload
          if (chainId) {
            state.multicall.callResults[chainId] = state.multicall.callResults[chainId] ?? {}
            calls.forEach((call) => {
              const callKey = toCallKey(call)
              const current = state.multicall.callResults[chainId][callKey]
              if (!current) return // only should be dispatched if we are already fetching
              if (current.fetchingBlockNumber === fetchingBlockNumber) {
                delete current.fetchingBlockNumber
                current.data = null
                current.blockNumber = fetchingBlockNumber
              }
            })
          }
          return state
        }
        case 'UPDATE_MULTICALL_LISTENER': {
          const { blockNumber, chainId, results } = action.payload
          if (chainId) {
            state.multicall.callResults[chainId] = state.multicall.callResults[chainId] ?? {}
            Object.keys(results).forEach((callKey) => {
              const current = state.multicall.callResults[chainId][callKey]
              if ((current?.blockNumber ?? 0) > blockNumber) return
              state.multicall.callResults[chainId][callKey] = {
                data: results[callKey],
                blockNumber,
              }
            })
          }
          return state
        }
        case 'UPDATE_BLOCK_NUMBER': {
          const { chainId, blockNumber } = action.payload
          if (!action.payload.blockNumber) {
            state.application.blockNumber = {}
          }
          if (chainId) {
            if (typeof state.application.blockNumber[chainId] !== 'number') {
              state.application.blockNumber[chainId] = blockNumber
            } else {
              state.application.blockNumber[chainId] = Math.max(blockNumber, state.application.blockNumber[chainId])
            }
          }
          return state
        }
        case 'ADD_TRANSACTION': {
          const { chainId, from, hash, approval, summary, claim } = action.payload
          const transactions = state.transactions
          if (hash) {
            if (transactions[chainId]?.[hash]) {
              throw Error('Attempted to add existing transaction.')
            }
            const txs = transactions[chainId] ?? {}
            txs[hash] = { hash, approval, summary, claim, from, addedTime: now() }
            transactions[chainId] = txs
          }
          return state
        }
        case 'CHECKED_TRANSACTION': {
          const { chainId, blockNumber, hash } = action.payload

          const transactions = state.transactions

          const tx = transactions[chainId]?.[hash]
          if (tx) {
            if (!tx.lastCheckedBlockNumber) {
              tx.lastCheckedBlockNumber = blockNumber
            } else {
              tx.lastCheckedBlockNumber = Math.max(blockNumber, tx.lastCheckedBlockNumber)
            }
          }

          return state
        }
        case 'CLEAR_ALL_TRANSACTIONS': {
          const { chainId } = action.payload
          const transactions = state.transactions

          if (transactions[chainId]) {
            transactions[chainId] = {}
          }
          return state
        }
        case 'FINALIZE_TRANSACTION': {
          const { chainId, hash, receipt } = action.payload
          const transactions = state.transactions
          const tx = transactions[chainId]?.[hash]
          if (tx) {
            tx.receipt = receipt
            tx.confirmedTime = now()
          }
          
          return state
        }
        default:
          return state
      }
    },
    { ...stateInitialValue }
  )

  // Actions to components
  const actions = useMemo(() => {
    return {
      toggleModal: () => {
        dispatch({ type: 'TOGGLE_MODAL' })
      },
      addMulticallListeners: (payload: ListenerProps) => {
        dispatch({ type: 'ADD_MULTICALL_LISTENER', payload })
      },
      removeMulticallListeners: (payload: ListenerProps) => {
        dispatch({ type: 'REMOVE_MULTICALL_LISTENER', payload })
      },
      fetchingMulticallResults: (payload: FetchingProps) => {
        dispatch({ type: 'FETCH_MULTICALL_LISTENER', payload })
      },
      errorFetchingMulticallResults: (payload: FetchingProps) => {
        dispatch({ type: 'ERROR_FETCH_MULTICALL_LISTENER', payload })
      },
      updateMulticallResults: (payload: ResultProps) => {
        dispatch({ type: 'UPDATE_MULTICALL_LISTENER', payload })
      },
      updateBlockNumber: (payload: UpdateBlockNumberPayload) => {
        dispatch({ type: 'UPDATE_BLOCK_NUMBER', payload })
      },
      checkedTransaction: (payload: CheckedTransactionPayload) => {
        dispatch({ type: 'CHECKED_TRANSACTION', payload })
      },
      addTransaction: (payload: AddTransactionPayload) => {
        dispatch({ type: 'ADD_TRANSACTION', payload })
      },
      finalizeTransaction: (payload: FinalizeTransaction) => {
        dispatch({ type: 'FINALIZE_TRANSACTION', payload })
      },
      clearAllTransactions: (payload: { chainId: number }) => {
        dispatch({ type: 'CLEAR_ALL_TRANSACTIONS', payload })
      },
    }
  }, [])

  return (
    <Web3StatusState.Provider value={state}>
      <Web3StatusActions.Provider value={actions}>{children}</Web3StatusActions.Provider>
    </Web3StatusState.Provider>
  )
}
