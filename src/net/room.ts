// net/room.ts — trystero wiring. API verified against trystero v0.25.3
// (@trystero-p2p/core types, Aug 2 2026):
//   joinRoom({appId}, roomId) → Room with onPeerJoin/onPeerLeave/leave/getPeers
//   room.makeAction<T>(ns, config?) → MessageAction<T> { send, onMessage, onReceiveProgress }
//   send(data, { target?, metadata?, onProgress? })
//   getPeers(): Record<peerId, RTCPeerConnection>  — used for quota detection

import { joinRoom as joinNostr } from 'trystero/nostr'
import { joinRoom as joinMqtt } from '@trystero-p2p/mqtt'
import type {
  FileAccept,
  FileCancel,
  FileDecline,
  FileDone,
  FileOffer,
  JsonValue,
  Peer,
  RoomId,
} from '../engine/types'

export const APP_ID = 'paimon_transfer'

export type SignalStrategy = 'nostr' | 'mqtt'

export type PeerMeta = {
  name: string
  device: Peer['device']
} & { [key: string]: JsonValue }

function metaId(metadata: JsonValue | undefined): string {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const v = (metadata as Record<string, JsonValue>).id
    return typeof v === 'string' ? v : ''
  }
  return ''
}

export interface RoomHandlers {
  onPeerJoin: (peerId: string) => void
  onPeerLeave: (peerId: string) => void
  onHello: (meta: PeerMeta, peerId: string) => void
  onOffer: (offer: FileOffer, peerId: string) => void
  onAccept: (accept: FileAccept, peerId: string) => void
  onDecline: (decline: FileDecline, peerId: string) => void
  onDone: (done: FileDone, peerId: string) => void
  onCancel: (cancel: FileCancel, peerId: string) => void
  onData: (payload: ArrayBuffer, id: string, peerId: string) => void
  onDataProgress: (percent: number, id: string | undefined, peerId: string) => void
}

export interface RoomConnection {
  strategy: SignalStrategy
  sendHello: (meta: PeerMeta) => void
  sendOffer: (peerId: string, offer: FileOffer) => void
  sendAccept: (peerId: string, id: string) => void
  sendDecline: (peerId: string, id: string) => void
  sendDone: (peerId: string, id: string, size: number) => void
  sendCancel: (peerId: string, id: string, reason?: string | null) => void
  sendData: (
    peerId: string,
    payload: ArrayBuffer,
    id: string,
    onProgress: (percent: number) => void,
  ) => void
  getPeers: () => Record<string, RTCPeerConnection>
  leave: () => void
}

export function connectRoom(
  code: RoomId,
  handlers: RoomHandlers,
  strategy: SignalStrategy = 'nostr',
  opts: { password?: string; relayUrls?: string[] } = {},
): RoomConnection {
  const join = strategy === 'mqtt' ? joinMqtt : joinNostr
  const config = {
    appId: APP_ID,
    password: opts.password || undefined,
    ...(strategy === 'nostr' && opts.relayUrls && opts.relayUrls.length > 0
      ? { relayConfig: { urls: opts.relayUrls } }
      : {}),
  }
  const room = join(config, code)

  const helloAction = room.makeAction<PeerMeta>('pt-hello')
  const offerAction = room.makeAction<FileOffer>('pt-offer')
  const acceptAction = room.makeAction<FileAccept>('pt-accept')
  const declineAction = room.makeAction<FileDecline>('pt-decline')
  const doneAction = room.makeAction<FileDone>('pt-done')
  const cancelAction = room.makeAction<FileCancel>('pt-cancel')
  const dataAction = room.makeAction<ArrayBuffer>('pt-data')

  room.onPeerJoin = (peerId) => handlers.onPeerJoin(peerId)
  room.onPeerLeave = (peerId) => handlers.onPeerLeave(peerId)

  helloAction.onMessage = (meta, { peerId }) => handlers.onHello(meta, peerId)
  offerAction.onMessage = (offer, { peerId }) => handlers.onOffer(offer, peerId)
  acceptAction.onMessage = (accept, { peerId }) => handlers.onAccept(accept, peerId)
  declineAction.onMessage = (decline, { peerId }) => handlers.onDecline(decline, peerId)
  doneAction.onMessage = (done, { peerId }) => handlers.onDone(done, peerId)
  cancelAction.onMessage = (cancel, { peerId }) => handlers.onCancel(cancel, peerId)
  dataAction.onMessage = (payload, { peerId, metadata }) =>
    handlers.onData(payload, metaId(metadata), peerId)
  dataAction.onReceiveProgress = (percent, { peerId, metadata }) =>
    handlers.onDataProgress(percent, metaId(metadata), peerId)

  return {
    strategy,
    sendHello: (meta) => void helloAction.send(meta),
    sendOffer: (peerId, offer) => void offerAction.send(offer, { target: peerId }),
    sendAccept: (peerId, id) => void acceptAction.send({ id }, { target: peerId }),
    sendDecline: (peerId, id) => void declineAction.send({ id }, { target: peerId }),
    sendDone: (peerId, id, size) => void doneAction.send({ id, size }, { target: peerId }),
    sendCancel: (peerId, id, reason) =>
      void cancelAction.send({ id, reason: reason ?? null }, { target: peerId }),
    sendData: (peerId, payload, id, onProgress) =>
      void dataAction.send(payload, { target: peerId, metadata: { id }, onProgress }),
    getPeers: () => room.getPeers(),
    leave: () => void room.leave(),
  }
}
