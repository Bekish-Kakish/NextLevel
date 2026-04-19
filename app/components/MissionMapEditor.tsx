"use client"

import { useState } from "react"

export default function MissionMapEditor() {

  const [nodes, setNodes] = useState([
    { id: 1, x: 22, y: 55 },
  ])

  function moveNode(id:number, x:number, y:number){
    setNodes(nodes.map(n =>
      n.id === id ? {...n, x, y} : n
    ))
  }

  function addNode(x:number, y:number){
    const newNode = {
      id: Date.now(),
      x,
      y
    }

    setNodes([...nodes, newNode])
  }

  function copyNodes(){
    const text = JSON.stringify(nodes, null, 2)
    navigator.clipboard.writeText(text)
    alert("Координаты скопированы")
  }

  return (

    <div style={{textAlign:"center"}}>

      <button onClick={copyNodes} style={{marginBottom:10}}>
        📋 Скопировать координаты
      </button>

      <div
        className="mission-map"
        onClick={(e)=>{

          const rect = e.currentTarget.getBoundingClientRect()

          const x = ((e.clientX - rect.left) / rect.width) * 100
          const y = ((e.clientY - rect.top) / rect.height) * 100

          addNode(x,y)

        }}
      >

        <img
          src="/maps/adventure-map.png"
          className="map-img"
        />

        {nodes.map(node => (

          <div
            key={node.id}
            className="mission-node"
            draggable
            style={{
              left:`${node.x}%`,
              top:`${node.y}%`
            }}

            onDragEnd={(e)=>{

              const rect = e.currentTarget.parentElement!.getBoundingClientRect()

              const x = ((e.clientX - rect.left) / rect.width) * 100
              const y = ((e.clientY - rect.top) / rect.height) * 100

              moveNode(node.id,x,y)

            }}

          >
            <img src="/icons/skull.png"/>
          </div>

        ))}

      </div>

    </div>
  )
}
