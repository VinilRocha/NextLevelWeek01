import { Request, Response} from 'express';
import knex from '../database/connection';

class PointsController {

    // Query para listar por cidade, uf e items
    async index(request: Request, response: Response){
        // cidade, uf, items (Query Params)
        const {city, uf, items} = request.query;

        const parsedItems = String(items)
        .split(',')
        .map( item => Number(item.trim()));

        const points = await knex('points')
        .join('point_items', 'points.id', '=', 'point_items.point_id')
        .whereIn('point_items.item_id', parsedItems)
        .where('city', String(city))
        .where('uf', String(uf))
        .distinct()
        .select('points.*');

        const serializedPoints = points.map(point =>{
            return {
                ... point,
                image_url: `http://192.168.15.5:3333/uploads/${point.image}`
            }
        })

        return response.json(serializedPoints);
    }

    // Query para relacionar e listar por ID
    async show(request: Request, response: Response){

        const { id } = request.params;
        // const id = request.params.id

        const point = await knex('points').where('id', id).first();

        if (!point){
            return response.status(400).json({message: "Point not found;"})
        }


        const serializedPoint = {
            ... point,
            image_url: `http://192.168.15.5:3333/uploads/${point.image}`
        }


        /* SELECT * FROM items 
        *   JOIN point_items ON items.id = point_items.item_id
        *   WHERE point_items.point_id = { id }
        */
        const items = await knex('items')
        .join('point_items', 'items.id', '=', 'point_items.item_id')
        .where('point_items.point_id', id)
        .select('items.title')

        return response.json({ point: serializedPoint, items });
    }

    // Cria um ponto de coleta na tabela points
    async create(request: Request, response: Response) {
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;

        const trx = await knex.transaction();

        /* transaction = só vai executar a query de cima "trx points",
            se a de baixo "trx point_items" não falhar
        */

        const point = {
            image: request.file.filename,
            name,
            // name:name
            // email:email
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        }

        const insertedIds = await trx('points').insert(point);

        const point_id = insertedIds[0];

        const pointsItems = items
        .split(',')
        .map((item: string) => Number(item.trim()))
        .map((item_id: number) => {
            return {
                item_id,
                point_id,
            }
        })

        await trx('point_items').insert(pointsItems);

        await trx.commit();
        // Commit faz o insert no banco de dados, quando usa trx (transaction)
        
        return response.json({ 
            id: point_id,
            ... point,
        });
    }
}

export default PointsController;