# Core Concepts of Logux Architecture

## Overview

Logux is a system for synchronizing action logs between peer-to-peer nodes. Key characteristics include:

- Supports connections between clients, servers, and mesh networks
- Nodes are treated equally (no fundamental difference between clients and servers)

### Architectural Diagram
```
[Client 1] ⇆ [Client 2] ⇆ [Server A] ⇆ [Server B]
```

## Core Concepts

### Actions

An action is a JSON object describing an operation, with mandatory `type` property:

```json
{
  type: 'user/rename',
  userId: 386,
  name: 'New name'
}
```

Key action log properties:
- Append-only log
- Can only add actions
- Can compress/clean old actions

### Metadata (Meta)

Each action has metadata containing:
- `meta.id`: Unique action identifier
- `meta.time`: Action creation time
- `meta.added`: Node-specific counter
- `meta.reasons`: Array tracking action relevance
- `meta.subprotocol`: Application protocol version

Example metadata:
```javascript
[action, {
  id: '1553821137583 388:mgxhClZT:mAKgAtBF 0',
  time: 1553821137582,
  added: 56,
  reasons: ['user:388:lastName'],
  subprotocol: 10,
  channels: ['users/388']
}]
```

## Key Synchronization Guarantees

- Each action synchronized only once
- Consistent action order across nodes
- Supports "Optimistic UI" concept
- Offline-first design

## Technical Specifications

- Default connection: WebSocket
- Customizable connection implementation
- Immutable actions
- Mutable metadata (with some restrictions)

## Navigation

### Related Sections
- [Next Chapter: Architecture Practice](../practice/)

### Documentation Sections
- Starting Project
- Architecture
- Concepts

## Source

Extracted from: https://logux.org/guide/architecture/core/

## Licensing

MIT License
Sponsored by Evil Martians