/**
 * Order Serializer — Task 62
 *
 * Compact binary serialization for GameOrder.
 * MoveOrder serializes to < 32 bytes.
 *
 * Source: harness/TASK_BREAKDOWN.md — Task 62
 * OpenRA 对标: Order.Serialize / Order.Deserialize
 */

import type { GameOrder, OrderString, OrderTarget } from '../game/order/GameOrder';

const ORDER_STRING_IDS: Record<OrderString, number> = {
  Move: 0x01,
  Attack: 0x02,
  AttackMove: 0x03,
  Guard: 0x04,
  Stop: 0x05,
  Build: 0x06,
  Sell: 0x07,
  Repair: 0x08,
  Deploy: 0x09,
  Follow: 0x0a,
  Patrol: 0x0b,
};

const ORDER_STRING_BY_ID: Record<number, OrderString> = Object.fromEntries(
  Object.entries(ORDER_STRING_IDS).map(([k, v]) => [v, k as OrderString])
);

const TARGET_TYPE_IDS = {
  none: 0x00,
  ground: 0x01,
  actor: 0x02,
} as const;

/** Serialize a GameOrder to a compact binary format. */
export function serializeOrder(order: GameOrder): Uint8Array {
  const orderId = ORDER_STRING_IDS[order.orderString];
  if (orderId === undefined) {
    throw new Error(`Unknown order string: ${order.orderString}`);
  }

  // Estimate max size: header(4) + subjectId(1+16) + target(1+4) + extra(2+256) = ~284
  // We'll allocate dynamically after computing exact size.
  const subjectBytes = new TextEncoder().encode(order.subjectId);
  const targetType = TARGET_TYPE_IDS[order.target.type];

  let extraDataBytes: Uint8Array | undefined;
  if (order.extraData && Object.keys(order.extraData).length > 0) {
    extraDataBytes = new TextEncoder().encode(JSON.stringify(order.extraData));
  }

  // Calculate exact size
  let size = 4 + 1 + subjectBytes.length; // header + subjectId length prefix + subjectId
  size += 1; // target type
  if (order.target.type === 'ground') {
    size += 4; // x, y as int16
  } else if (order.target.type === 'actor') {
    const actorIdBytes = new TextEncoder().encode(order.target.actorId ?? '');
    size += 1 + actorIdBytes.length;
  }
  if (extraDataBytes) {
    size += 2 + extraDataBytes.length;
  }

  const buf = new Uint8Array(size);
  let off = 0;

  buf[off++] = orderId;
  buf[off++] = targetType;
  buf[off++] = order.queued ? 0x01 : 0x00;

  // subjectId
  buf[off++] = subjectBytes.length;
  buf.set(subjectBytes, off);
  off += subjectBytes.length;

  // target data
  if (order.target.type === 'ground') {
    const view = new DataView(buf.buffer, buf.byteOffset + off);
    view.setInt16(0, Math.round(order.target.x ?? 0), true);
    view.setInt16(2, Math.round(order.target.y ?? 0), true);
    off += 4;
  } else if (order.target.type === 'actor') {
    const actorIdBytes = new TextEncoder().encode(order.target.actorId ?? '');
    buf[off++] = actorIdBytes.length;
    buf.set(actorIdBytes, off);
    off += actorIdBytes.length;
  }

  // extraData
  if (extraDataBytes) {
    const view = new DataView(buf.buffer, buf.byteOffset + off);
    view.setUint16(0, extraDataBytes.length, true);
    off += 2;
    buf.set(extraDataBytes, off);
    off += extraDataBytes.length;
  }

  return buf;
}

/** Deserialize a compact binary GameOrder. */
export function deserializeOrder(data: Uint8Array): GameOrder {
  if (data.length < 4) {
    throw new Error('Order data too short');
  }

  let off = 0;
  const orderId = data[off++];
  const orderString = ORDER_STRING_BY_ID[orderId];
  if (!orderString) {
    throw new Error(`Unknown order id: ${orderId}`);
  }

  const targetTypeVal = data[off++];
  const queued = data[off++] === 0x01;

  const subjectIdLen = data[off++];
  const subjectId = new TextDecoder().decode(data.subarray(off, off + subjectIdLen));
  off += subjectIdLen;

  let target: OrderTarget;
  if (targetTypeVal === TARGET_TYPE_IDS.ground) {
    const view = new DataView(data.buffer, data.byteOffset + off);
    const x = view.getInt16(0, true);
    const y = view.getInt16(2, true);
    off += 4;
    target = { type: 'ground', x, y };
  } else if (targetTypeVal === TARGET_TYPE_IDS.actor) {
    const actorIdLen = data[off++];
    const actorId = new TextDecoder().decode(data.subarray(off, off + actorIdLen));
    off += actorIdLen;
    target = { type: 'actor', actorId };
  } else {
    target = { type: 'none' };
  }

  let extraData: Record<string, unknown> | undefined;
  if (off + 2 <= data.length) {
    const view = new DataView(data.buffer, data.byteOffset + off);
    const extraLen = view.getUint16(0, true);
    off += 2;
    if (extraLen > 0 && off + extraLen <= data.length) {
      const extraJson = new TextDecoder().decode(data.subarray(off, off + extraLen));
      extraData = JSON.parse(extraJson) as Record<string, unknown>;
    }
  }

  return { orderString, subjectId, target, queued, extraData };
}

/** Return the byte size of a serialized GameOrder (for stats / validation). */
export function serializedSize(order: GameOrder): number {
  return serializeOrder(order).length;
}
