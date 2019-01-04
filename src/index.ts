import { raw, QueryBuilder, Model, PartialUpdate } from "objection"

interface Options {
	id_field?: string
	order_field?: string
}

const default_options = {
	id_field: "id",
	order_field: "sort_order",
}

export default async function set_position<QM extends Model>(
	query: QueryBuilder<QM>,
	id: any,
	position: number,
	options?: Options,
) {
	const { id_field, order_field } = { ...default_options, ...options }

	// Let's say the target position is 5.
	// For all objects that will have position >5, increase their order_field by 2.
	const next_obj: any = await query
		.clone()
		.whereIn(
			id_field,
			query
				.clone()
				.select(id_field)
				.where(id_field, "!=", id)
				.orderBy(order_field)
				.offset(position),
		)
		.update({ [order_field]: raw("?? + 2", order_field) } as PartialUpdate<QM>)
		.returning(order_field)
		.orderBy(order_field)
		.first()

	// Then set target object's position to the minimum order_field of the affected row set (minus 1),
	// or, if there were none, to maximum order_field across all query (plus 1).
	await query
		.clone()
		.where(id_field, id)
		.update({
			[order_field]: next_obj
				? next_obj[order_field] - 1
				: query.clone().select(raw("max(??) + 1", order_field)),
		} as PartialUpdate<QM>)
}
