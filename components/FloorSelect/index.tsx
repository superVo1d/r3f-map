import { useMemo } from "react";
import styles from './index.module.scss';
import classnames from 'classnames';

export interface IFloorSelect {
    levels: number;
    activeIndex: number;
    setActiveIndex: (value: number) => void;
}

export default function FloorSelect({ levels, activeIndex, setActiveIndex }: IFloorSelect) {
    const levelsPrepared = useMemo(() => new Array(levels).fill(1).map((_, index) => index + 1), [levels]);
    
    return (
        <div className={styles['floor-select']}>
            <ul>
                {levelsPrepared.map((level, index) => (
                    <li key={index}>
                        <button
                            onClick={() => setActiveIndex(index)}
                            className={classnames(styles['floor-select__item'], {
                                [styles['floor-select__item_active']]: index === activeIndex
                            })}
                        >
                            { level }
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}