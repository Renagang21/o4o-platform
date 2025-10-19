export interface MetaValue {
    fieldId: string;
    fieldName: string;
    value: string | number | boolean | Date | null | string[] | Record<string, unknown>;
}
export interface ManyMetaResult {
    [entityId: string]: {
        [fieldName: string]: string | number | boolean | Date | null | string[] | Record<string, unknown>;
    };
}
/**
 * 통일된 메타데이터 접근 레이어
 * EAV(Entity-Attribute-Value) 모델을 사용하여 모든 ACF 데이터를 관리
 */
export declare class MetaDataService {
    private fieldValueRepo;
    private fieldRepo;
    /**
     * 단일 개체의 특정 필드 값을 가져옵니다
     * @param entityType 엔티티 타입 ('post', 'user', 'term' 등)
     * @param entityId 엔티티 ID
     * @param fieldId 필드 ID 또는 필드명
     * @returns 필드 값 또는 undefined
     */
    getMeta(entityType: string, entityId: string, fieldId: string): Promise<string | number | boolean | Date | null | string[] | Record<string, unknown> | undefined>;
    /**
     * 단일 개체의 특정 필드 값을 저장합니다
     * @param entityType 엔티티 타입
     * @param entityId 엔티티 ID
     * @param fieldId 필드 ID 또는 필드명
     * @param value 저장할 값
     * @returns 성공 여부
     */
    setMeta(entityType: string, entityId: string, fieldId: string, value: string | number | boolean | Date | null | string[] | Record<string, unknown>): Promise<boolean>;
    /**
     * 여러 개체의 여러 필드 값을 효율적으로 가져옵니다 (N+1 문제 방지)
     * @param entityType 엔티티 타입
     * @param entityIds 엔티티 ID 배열
     * @param fieldIds 필드 ID 또는 필드명 배열 (선택사항, 없으면 모든 필드)
     * @returns 중첩된 객체 형태의 결과
     */
    getManyMeta(entityType: string, entityIds: string[], fieldIds?: string[]): Promise<ManyMetaResult>;
    /**
     * 특정 엔티티의 모든 메타 값을 삭제합니다
     * @param entityType 엔티티 타입
     * @param entityId 엔티티 ID
     * @returns 성공 여부
     */
    deleteMeta(entityType: string, entityId: string): Promise<boolean>;
    /**
     * 특정 엔티티의 특정 필드 값을 삭제합니다
     * @param entityType 엔티티 타입
     * @param entityId 엔티티 ID
     * @param fieldId 필드 ID 또는 필드명
     * @returns 성공 여부
     */
    deleteMetaField(entityType: string, entityId: string, fieldId: string): Promise<boolean>;
    /**
     * 여러 필드 값을 한 번에 저장합니다 (트랜잭션 사용)
     * @param entityType 엔티티 타입
     * @param entityId 엔티티 ID
     * @param values 필드명-값 객체
     * @returns 성공 여부
     */
    setManyMeta(entityType: string, entityId: string, values: Record<string, string | number | boolean | Date | null | string[] | Record<string, unknown>>): Promise<boolean>;
}
export declare const metaDataService: MetaDataService;
//# sourceMappingURL=MetaDataService.d.ts.map