import { Model, QueryBuilder } from "objection"
import { reorder } from "objection-reorder"
import { afterEach, beforeEach, expect, test } from "vitest"

import { setup } from "./setup"

class FooModel extends Model {
	static tableName = "foo"

	id?: number
	sort_order?: number
}

const knex = await setup()

beforeEach(async () => {
	await knex.schema.createTable("foo", (table) => {
		table.integer("id").notNullable().primary()
		table.integer("sort_order").notNullable()
	})
})

afterEach(async () => {
	await knex.schema.dropTable("foo")
})

async function expect_order(
	q: QueryBuilder<FooModel, FooModel[]>,
	ids: number[]
) {
	expect(
		await q
			.select("id")
			.orderBy("sort_order")
			.then((foos) => foos.map((foo) => foo.id))
	).toEqual(ids)
}

test("main", async () => {
	await FooModel.query().insertGraph([
		{ id: 10, sort_order: 0 },
		{ id: 5, sort_order: 1 },
		{ id: 8, sort_order: 2 },
		{ id: 7, sort_order: 3 },
	])

	await reorder(FooModel.query(), { id: 10, sort_order: 2 })
	await expect_order(FooModel.query(), [5, 8, 10, 7])

	await reorder(FooModel.query(), { id: 10, sort_order: 0 })
	await expect_order(FooModel.query(), [10, 5, 8, 7])

	await reorder(FooModel.query(), { id: 10, sort_order: 3 })
	await expect_order(FooModel.query(), [5, 8, 7, 10])

	await reorder(FooModel.query(), { id: 8, sort_order: 3 })
	await expect_order(FooModel.query(), [5, 7, 10, 8])

	// nested transaction
	await FooModel.transaction(async (trx) => {
		await reorder(FooModel.query(trx), { id: 7, sort_order: 2 })
		await expect_order(FooModel.query(trx), [5, 10, 7, 8])
		await trx.rollback()
	})
	await expect_order(FooModel.query(), [5, 7, 10, 8])
})

test("errors", async () => {
	await expect(
		reorder(FooModel.query(), { sort_order: 3 })
	).rejects.toThrowError("Missing ID in update.")

	await expect(
		reorder(FooModel.query(), { key: 10, sort_order: 3 } as any)
	).rejects.toThrowError("Missing ID in update.")

	await expect(
		reorder(FooModel.query(), { id: 10, sort_order: 3, name: "Blaster" } as any)
	).rejects.toThrowError(
		"Update must have only ID and new position, no extra columns."
	)

	await expect(
		reorder(FooModel.query(), { id: 10, sort_order: 2.5 })
	).rejects.toThrowError("Position must be a non-negative integer.")

	await expect(
		reorder(FooModel.query(), { id: 10, sort_order: -1 })
	).rejects.toThrowError("Position must be a non-negative integer.")

	await expect(
		reorder(FooModel.query(), { id: 10, sort_order: "foo" as any })
	).rejects.toThrowError("Position must be a non-negative integer.")
})
