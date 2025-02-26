import { useState, useEffect } from 'react'

export default function GenreMovieList({ genre }) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [movies, setMovies] = useState()
  const [total, setTotal] = useState()

  // Get data from the API
  useEffect(() => {
    fetch(`/api/genres/${genre.name}/movies?page=${page}&limit=${limit}`)
      .then(res => res.json())
      .then(json => {
        setMovies(json.data)
        setTotal(json.total)
      })
  }, [genre, page, limit])

  // Loading State
  if (!movies || !total) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <ul>
        {movies.map(movie => (
          <li key={movie.tmdbId}>{movie.title}</li>
        ))}
      </ul>
      <p>Showing page {page}</p>
      {page > 1 && (
        <button onClick={() => setPage(page - 1)}>Previous</button>
      )}
      {page * limit < total && (
        <button onClick={() => setPage(page + 1)}>Next</button>
      )}
    </div>
  )
}