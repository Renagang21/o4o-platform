# CHECK-O4O-MY-STORE-HANDLED-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1

> 대상: KPA-Society / PharmacyHub 매장 경영활용 제품
> 기준: `work/commonization-my-store`
> 결과: PASS (공통 계약 추출) / runtime build는 실행 환경 제약으로 미실행

## 1. 조사 결론

- KPA `/store/handled-products`와 PharmacyHub `/store-owner/handled-products`는 같은 업무 축인 **매장 경영활용 제품**이다.
- 두 API의 목록 item은 `sourceType/sourceId/name/imageUrl/originLabel/ownerLabel/price/isActive/classificationCode/classificationLabel/updatedAt/managePath`가 동일하다.
- PharmacyHub만 `masterId`와 `storeConnection`을 추가로 가진다.
- KPA UI는 O4O 표준상품 추가, 신규상품 요청, 상세설명서, 다국어 콘텐츠, 상품 QR 등 KPA 고유 액션이 많다.
- PharmacyHub UI는 공급 상품에서 추가, 활성/비활성, 매장 연결 상태 등 PharmacyHub 업무 규칙을 가진다.
- K-Cosmetics/GlycoPharm의 `StoreLocalProductsManager`는 `StoreLocalProduct` CRUD 축으로 의미가 다르므로 이번 handled-products 공통화 대상에서 제외한다.
- Neture에는 대응하는 store-owner handled-products 화면을 확인하지 못해 미적용한다.

## 2. 공통 Core

신규: `packages/store-ui-core/src/types/handledProducts.ts`

공통화한 계약:

- `HandledProductSource = 'listing' | 'local'`
- `HandledProductListItem`
- `HandledProductsPagination`
- `HandledProductRef`
- `handledProductKey()`

패키지 export:

- `@o4o/store-ui-core/handled-products`

이 Core는 API URL, 권한, 등록/삭제 정책, 화면 문구를 모른다.

## 3. 서비스 적용

### KPA-Society

`services/web-kpa-society/src/api/handledProducts.ts`

- 중복 `HandledProductSource` / `HandledProduct` / pagination shape 제거
- 공통 계약을 import해 사용
- 기존 `/api/v1/store/handled-products` API와 QR/삭제 동작 불변
- KPA 전용 UI/모달/액션 불변

### PharmacyHub

`services/web-pharmacy-hub/src/lib/api/pharmacyHubHandledProducts.ts`

- 공통 base item/pagination/source 계약 사용
- `masterId`는 `HandledProductListItem`을 확장하는 service-local field로 유지
- `HandledStoreConnection`, 공급 상품 등록, 활성/비활성 API는 service-local 유지
- `/pharmacy-hub/store-owner/handled-products` URL과 권한 의미 불변

## 4. 변경하지 않은 것

- backend / controller / route
- DB / migration
- 권한
- 주문/장바구니/공급상품 의미
- KPA QR·상세설명서·다국어·신규상품 요청
- PharmacyHub 공급상품 추가·매장연결·활성화 정책
- K-Cosmetics / GlycoPharm Local Products

## 5. 검증

정적 확인:

- KPA와 PharmacyHub 모두 `@o4o/store-ui-core` workspace dependency 보유
- package exports에 `./handled-products` 추가
- 두 서비스 API client가 동일 공통 타입을 소비
- PharmacyHub `masterId` 확장 보존
- API endpoint 문자열 변경 0
- backend 변경 0

실행 검증:

- 현재 ChatGPT 실행 컨테이너는 `github.com` DNS resolve가 차단되어 repository clone/worktree 생성 및 `pnpm` 실행이 불가능했다.
- 따라서 typecheck/build를 실행했다고 기록하지 않는다.
- GitHub branch에는 required status checks가 설정되어 있지 않아 원격 CI 결과도 없다.

로컬 검증 권장 명령:

```bash
pnpm --filter @o4o/store-ui-core build
pnpm --filter @o4o/web-kpa-society build
pnpm --filter pharmacy-hub-web build
```

## 6. DB write / deploy

- DB write: 0
- migration: 0
- 배포: 0

## 7. 후속 판단

handled-products의 **도메인 계약 공통화는 완료**했다.
다음 단계에서 UI까지 더 합치려면 먼저 목록 table/toolbar의 실제 공통 부분만 별도 추출해야 한다. KPA의 고유 기능을 PharmacyHub에 이식하거나 두 화면을 강제로 동일하게 만드는 방식은 사용하지 않는다.
