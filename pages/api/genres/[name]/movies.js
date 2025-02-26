import { read } from '../../../../lib/neo4j'
import { int } from 'neo4j-driver'

export default async function handler(req, res) {
  const { name } = req.query
  const limit = 10
  const page = parseInt(req.query.page || '1')
  const skip = (page - 1) * limit

  const result = await read(`
    MATCH (m:Movie)-[:IN_GENRE]->(g:Genre {name: $genre})
    RETURN
      g { .* } AS genre,
      toString(size((g)<-[:IN_GENRE]-())) AS count,
      m {
        .tmdbId,
        .title
      } AS movie
    ORDER BY m.title ASC
    SKIP $skip
    LIMIT $limit
  `, {
    genre: name,
    limit: int(limit),
    skip: int(skip)
  })

  res.status(200).json({
    total: parseInt(result[0]?.count) || 0,
    data: result.map(record => record.movie)
  })
}