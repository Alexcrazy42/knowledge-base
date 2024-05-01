import { useState } from 'react'


function Button({ name, onClick }) {
    const [count, setCount] = useState(0)


    return(
        <>
            <button onClick={() => onClick}>
                {name}
            </button>
        </>
    )
}

export default Button
