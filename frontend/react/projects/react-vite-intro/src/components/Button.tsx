import { useState } from 'react'


function Button({ name }) {
    const [count, setCount] = useState(0)


    return(
        <>
            <button>
                {name}
            </button>
        </>
    )
}

export default Button
