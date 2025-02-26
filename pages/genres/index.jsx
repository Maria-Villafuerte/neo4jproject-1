import Link from 'next/link'
import { read } from '../../lib/neo4j'

export async function getServerSideProps() {
  const res = await read(`
    MATCH (p:Person)
    RETURN p.name
    LIMIT 10
  `)
  
  const people = res.map(row => row['p.name'])
  
  return {
    props: {
      people,
    }
  }
}

export default function PeopleList({ people }) {
  return (
    <div>
      <h1>People</h1>
      <ul>
        {people.map((name, index) => (
          <li key={index}>{name}</li>
        ))}
      </ul>
      <div>
        <a href="/">Back to home</a>
      </div>
    </div>
  )
}