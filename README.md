# objection-reorder

If you have a Postgres table with objects ordered with a dedicated field:

```
id | name | sort_order
---+------+-----------
10 | Foo  | 0
3  | Bar  | 1
8  | Baz  | 2
7  | Qoox | 3
```

and you have a UI where a user may drag and drop objects to reorder them, producing API calls like:

```
POST /objects/10/order?position=2
```

(meaning: _"put Foo onto position 2, between Baz and Qoox"_)

and you have a backend server with Node.js and Objection.js,

then this library provides a utility function to update `sort_order` accordingly:

```
id | name | sort_order
---+------+-----------
3  | Bar  | 1
8  | Baz  | 2
10 | Foo  | 3 <--- object moved here, sort_order updated.
7  | Qoox | 4
```

_(The example is provided for illustration. The actual resulting values of `sort_order` could be different due to SQL updates optimization, but the resulting order of objects is guaranteed to be correct.)_

## Installation

```sh
npm i objection-reorder
```

## Usage

Example:

```ts
import { reorder } from "objection-reorder"
import { MyModel } from "~/my-objection-models/MyModel"

const { id, position } = ctx.params // object ID and desired position
await reorder(MyModel.query(), { id, sort_order: position }) // where sort_order is a non-nullable integer column, and position is desired 0-based index
```

- Database ID column will be detected with `MyModel.idColumn` (composite keys not currently supported).
- The other field will be treated as storing the sort order.

## Sharding

Ordering can be managed separately in different shards (slices) of the table. For example, if `MyModel` has parent/child relation, children of a certain parent can be reordered with:

```ts
await reorder(MyModel.query().where({ parent }), {
  id: child_id,
  sort_order: position,
})
```

## Non-unique sort order values

While not recommended, non-unique sort order values are supported. `reorder` will work correctly even if e.g. all values are set to 0. (In particular, that means you don't necessarily have to come up with a data migration when introducing the custom order field).
