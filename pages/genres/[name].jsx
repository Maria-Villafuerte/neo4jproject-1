import Link from 'next/link'
import { read } from '../../lib/neo4j'
import { int } from 'neo4j-driver'
import GenreMovieList from '../../components/genre/movie-list'

export async function getServerSideProps({ query, params }) {
  const limit = 10
  const page = parseInt(query.page ?? '1')
  const skip = (page - 1) * limit
  
  const res = await read(`
    MATCH (g:Genre {name: $genre})
    WITH g, size((g)<-[:IN_GENRE]-()) AS count
    MATCH (m:Movie)-[:IN_GENRE]->(g)
    RETURN
      g { .* } AS genre,
      toString(count) AS count,
      m {
        .tmdbId,
        .title
      } AS movie
    ORDER BY m.title ASC
    SKIP $skip
    LIMIT $limit
  `, {
    genre: params.name,
    limit: int(limit),
    skip: int(skip)
  })
  
  const genre = res[0]?.genre || {}
  const count = res[0]?.count || "0"
  
  return {
    props: {
      genre,
      count,
      movies: res.map(record => record.movie),
      page, 
      skip, 
      limit,
    }
  }
}

export default function GenreDetails({ genre, count, movies, page, skip, limit }) {
  return (
    <div>
      <h1>{genre.name}</h1>
      <p>There are {count} movies listed as {genre.name}.</p>
      
      <ul>
        {movies.map(movie => (
          <li key={movie.tmdbId}>{movie.title}</li>
        ))}
      </ul>
      
      <p>
        Showing page #{page}. <br />
        {page > 1 && (
          <Link href={`/genres/${genre.name}?page=${page-1}`}>Previous</Link>
        )}
        {' '}
        {skip + limit < parseInt(count) && (
          <Link href={`/genres/${genre.name}?page=${page+1}`}>Next</Link>
        )}
      </p>
    </div>
  )
}

export async function getServerSideProps({ query, params }) {
  const res = await read(`
    MATCH (g:Genre {name: $genre})
    RETURN g { .* } AS genre
  `, {
    genre: params.name
  })
  
  return {
    props: {
      genre: res[0]?.genre || {},
    }
  }
}

export default function GenreDetails({ genre }) {
  return (
    <div>
      <h1>{genre.name}</h1>
      <GenreMovieList genre={genre} />
    </div>
  )
}