import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export const MonksLogo = ({ onComplete }: { onComplete?: () => void }) => {
    // --- Refs ---
    const containerRef = useRef<HTMLDivElement>(null);
    const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
    const dotRef = useRef<HTMLSpanElement>(null);
    const subtextRef = useRef<HTMLDivElement>(null);

    const [isReady, setIsReady] = useState(false);
    const onCompleteRef = useRef(onComplete);

    // Data
    const logoWord = 'Dev';
    const letters = logoWord.split('');

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        // Allow DOM to paint so clipping masks calculate correctly
        const timer = setTimeout(() => setIsReady(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isReady) return;

        const ctx = gsap.context(() => {
            const chars = lettersRef.current.filter(Boolean);
            const dot = dotRef.current;
            const subtext = subtextRef.current;

            if (!chars.length || !dot || !subtext) return;

            // 1. INITIAL STATES: 
            // Letters pushed down below their clipping wrapper, slightly rotated
            gsap.set(chars, { y: '110%', rotateZ: 4 });
            gsap.set(dot, { scale: 0, opacity: 0, transformOrigin: 'center bottom' });
            gsap.set(subtext, { opacity: 0, y: 10 });

            // 2. THE CHOREOGRAPHY (The Keynote Reveal)
            const introTl = gsap.timeline({
                delay: 0.3, // Slight delay for dramatic effect
                onComplete: () => {
                    onCompleteRef.current?.();
                }
            });

            introTl
                // Letters aggressively slide up and snap into place
                .to(chars, {
                    y: '0%',
                    rotateZ: 0,
                    stagger: 0.04, // Tight stagger for a "wave" feel
                    duration: 1.2,
                    ease: 'expo.out' // Apple's signature snappy, physical easing
                })
                // The glowing period pops in
                .to(dot, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.7,
                    ease: 'back.out(2)' // Springy pop
                }, "-=0.7")
                // Subtext gently fades and lifts
                .to(subtext, {
                    opacity: 1,
                    y: 0,
                    duration: 1,
                    ease: 'power3.out'
                }, "-=0.6");

            // 3. AMBIENT GRADIENT SHIFT
            // The period's colors slowly wash back and forth
            gsap.to(dot, {
                backgroundPosition: '200% center',
                duration: 6,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });

        }, containerRef);

        return () => ctx.revert();
    }, [isReady]);

    return (
        <div
            ref={containerRef}
            // Pure white background, absolute minimalism
            className={`flex flex-col items-center justify-center w-full min-h-[400px] bg-white transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-0'} font-sans select-none overflow-hidden`}
        >
            {/* === MAIN TYPOGRAPHY === */}
            <div className="relative flex items-end justify-center mb-6 z-10">
                <div
                    className="flex text-[#1d1d1f]"
                    // Extremely tight tracking (letter-spacing) is a hallmark of Apple's SF Pro Display
                    style={{ letterSpacing: '-0.06em' }}
                >
                    {letters.map((char, index) => (
                        // The Clipping Mask Wrapper
                        <div key={index} className="overflow-hidden leading-[0.8] pb-1 px-[2px]">
                            <span
                                ref={(el) => { lettersRef.current[index] = el; }}
                                className="inline-block font-semibold text-[100px] md:text-[160px] origin-bottom-left will-change-transform"
                            >
                                {char}
                            </span>
                        </div>
                    ))}
                </div>

                {/* The "Apple Intelligence" Period */}
                <div className="leading-[0.8] pb-1 px-[2px] mb-[2px] ml-1">
                    <span
                        ref={dotRef}
                        className=" inline-block font-semibold text-[100px] md:text-[160px] will-change-transform"
                        style={{
                            // A vibrant, wide gradient that gets animated left to right
                            backgroundImage: 'linear-gradient(to right, #FF2D55 0%, #AF52DE 25%, #007AFF 50%, #AF52DE 75%, #FF2D55 100%)',
                            backgroundSize: '200% auto',
                            backgroundPosition: '0% center',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.06em'
                        }}
                    >
                        .
                    </span>
                </div>
            </div>

            {/* === SUBTITLE === */}
            <div
                ref={subtextRef}
                // Extremely tiny, spaced out, stark gray text
                className="relative z-10 text-[10px] md:text-[11px] text-[#86868b] font-medium tracking-[0.35em]"
            >
                Designed by .monks
            </div>

        </div>
    );
};