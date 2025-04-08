import {useCallback, useEffect, useRef} from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';

export default function Confetti() {
    const refAnimInst = useRef(null);
    const getInstance = useCallback(instance => {
        refAnimInst.current = instance;
    }, []);

    const shoot = useCallback((particleRatio, opts) => {
        refAnimInst.current && refAnimInst.current({
            ...opts, 
            origin: {y: 0.7},
            particleCount: Math.floor(200 * particleRatio)
        })
    }, [])
    
    useEffect(() => fire(), []);

    const fire = useCallback(() => {
        shoot(0.25, {
            spread: 26,
            startVelocity: 55
        });

        shoot(0.2, {
            spread: 60
        });

        shoot(0.35, {
            spread: 100,
            decay: 0.9,
            scalar: 0.8
        });

        shoot(0.1, {
            spread: 120,
            startVelocity: 45
        });
    }, [shoot]);

    return(
        <ReactCanvasConfetti
            refConfetti={getInstance}
            style={{
                position: 'fixed',
                pointerEvent: 'none',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0
            }}
        />
    );
}