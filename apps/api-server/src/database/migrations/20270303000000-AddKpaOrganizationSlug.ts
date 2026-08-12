/**
 * AddKpaOrganizationSlug
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §1
 *
 * 분회 서비스는 `kpa_organizations` 를 분회 Registry 로 그대로 사용한다.
 * 새 분회 마스터 테이블·seed 는 만들지 않는다 (WO 기준 원칙).
 *
 * 왜 slug 컬럼이 필요한가:
 *   분회명은 유일하지 않다. 실측(2026-08-12) 결과 `강남구약사회`·`종로구약사회`·
 *   `서울특별시약사회` 가 각 2행씩 존재한다 (구 seed 의 고정 UUID `a0000000-…` 트리와
 *   `20260212100000-SeedKpaOrganizationsFullHierarchy` 트리가 공존).
 *   따라서 이름 기반 URL 해석이 불가능하며, URL 안정성을 위한 별도 축이 필요하다.
 *
 * 안전성:
 *   - additive · nullable — 기존 read/write 경로 동작 불변
 *   - FK 없음 (실측: kpa_organizations 를 참조하는 FK 제약 0건)
 *   - UNIQUE 는 부분 인덱스(WHERE slug IS NOT NULL) — 이후 신규 분회가 slug 없이
 *     삽입돼도 실패하지 않는다
 *   - backfill 은 id → slug 명시 매핑. 런타임 변환 로직 없음(재현·감사 가능)
 *   - 멱등: 이미 slug 가 있는 행은 건드리지 않는다
 *
 * slug 생성 규칙 (본 migration 작성 시점에 1회 계산한 결과를 고정 매핑으로 박았다):
 *   `약사회` 접미 제거 → 지부/본회는 `특별시|광역시|특별자치시|특별자치도|도` 접미 추가 제거
 *   → 한글 자모 기반 결정적 로마자 전사 → 소문자 → 충돌 시 생성순(created_at,id) `-2` 부여.
 *   충돌 3건은 전부 구 seed 의 중복행이며 정상 seed 행이 짧은 slug 를 가진다.
 *   전사는 완전한 국어의 로마자 표기법이 아니다(예: 중랑구 → jungranggu). slug 는
 *   표기 규범이 아니라 URL 키이며, 운영자가 이후 개별 수정할 수 있는 값으로 둔다.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

/** [kpa_organizations.id, slug] — 2026-08-12 프로덕션 실데이터 228행 기준 */
const SLUG_MAP: Array<[string, string]> = [
  ['a0000000-0a00-4000-a000-000000000001', 'daehan'], // association 대한약사회
  ['70e04592-9468-4b41-bbba-ffb9c901334b', 'seoul'], // branch 서울특별시약사회
  ['fb646fff-259c-4244-8b7f-d3545c26a5b1', 'busan'], // branch 부산광역시약사회
  ['89f16f98-edb6-4c3a-94b9-1e38d42fc6ef', 'daegu'], // branch 대구광역시약사회
  ['df6c78e8-7317-4a9e-98a8-f6c8828c5a2a', 'incheon'], // branch 인천광역시약사회
  ['770c6ea9-3482-45a0-b3ee-c8c0608e6b3e', 'gwangju'], // branch 광주광역시약사회
  ['351425a6-2d75-48cc-b1d6-39f895ad0755', 'daejeon'], // branch 대전광역시약사회
  ['ecede174-db1b-4649-9cc6-6ec166efffea', 'ulsan'], // branch 울산광역시약사회
  ['4146ad71-e590-4c49-9b56-a32e70694604', 'sejong'], // branch 세종특별자치시약사회
  ['68dfd96e-ca88-4e46-8bc6-68b15b797524', 'gyeonggi'], // branch 경기도약사회
  ['7f092134-d270-49b9-a7e7-338d87367401', 'gangwon'], // branch 강원특별자치도약사회
  ['748f4b45-687a-4f95-95ed-3ac841d79bf1', 'chungcheongbuk'], // branch 충청북도약사회
  ['17df74d0-08fb-4c16-b076-4ccb4e0a19be', 'chungcheongnam'], // branch 충청남도약사회
  ['79285779-596a-4e81-a2b6-31ce5704e1b9', 'jeonbuk'], // branch 전북특별자치도약사회
  ['b8a0c4e6-acef-4a6a-a792-e079e7d258fb', 'jeollanam'], // branch 전라남도약사회
  ['7e0e1f31-fab6-4bc1-b612-b308ae9682fc', 'gyeongsangbuk'], // branch 경상북도약사회
  ['6d7407b3-726c-46a0-a54c-14cc80520547', 'gyeongsangnam'], // branch 경상남도약사회
  ['e64949cc-2264-4860-b7b3-01719dfd52dd', 'jeju'], // branch 제주특별자치도약사회
  ['a0000000-0a00-4000-a000-000000000002', 'seoul-2'], // branch 서울특별시약사회
  ['36039b4d-525e-4e8e-8335-06d29f4a9672', 'jongrogu'], // group 종로구약사회
  ['3de5c9f7-3ce0-4871-9346-5694200bb2be', 'junggu'], // group 중구약사회
  ['a47cc501-23c7-43c8-8dd3-4db92b2d871e', 'yongsangu'], // group 용산구약사회
  ['524fead5-b1c5-452f-ac47-b9644e99f5c6', 'seongdonggu'], // group 성동구약사회
  ['d02a4ab9-85ad-46f1-98eb-d8c338e2fcef', 'gwangjingu'], // group 광진구약사회
  ['8e02c4f1-e851-4eb8-90a0-2bdbaba23336', 'dongdaemungu'], // group 동대문구약사회
  ['d3f9b423-c26b-40f3-a91a-78f930e17a1a', 'jungranggu'], // group 중랑구약사회
  ['1a452427-64a7-4f1e-9249-8246e0e70073', 'seongbukgu'], // group 성북구약사회
  ['643fcb05-6073-4a1f-bad8-87158e734a73', 'gangbukgu'], // group 강북구약사회
  ['14dd7e34-6745-4738-bd27-af430003df82', 'dobonggu'], // group 도봉구약사회
  ['ec47d335-bd8d-4120-b8e8-f02c17219fb7', 'nowongu'], // group 노원구약사회
  ['3bd98b5e-4920-4246-8fe7-89779d46e1bd', 'eunpyeonggu'], // group 은평구약사회
  ['4f5e223e-a343-4540-84f9-c43782319675', 'seodaemungu'], // group 서대문구약사회
  ['a461b3a6-a63f-4d76-9bbb-a1f38d034112', 'mapogu'], // group 마포구약사회
  ['38fc1421-23df-4595-b0e0-778856b49034', 'yangcheongu'], // group 양천구약사회
  ['168c7635-233c-4827-915e-2c6d033d0720', 'gangseogu'], // group 강서구약사회
  ['45d3e5cb-9088-4272-adc1-52439b5f5544', 'gurogu'], // group 구로구약사회
  ['1c329ad1-2cbf-42b3-8e25-b71da9b979cd', 'geumcheongu'], // group 금천구약사회
  ['1578a7a7-a1c7-461f-a7dd-228e2c0307be', 'yeongdeungpogu'], // group 영등포구약사회
  ['82100cb0-3f6e-456b-bc92-df4d88168e71', 'dongjakgu'], // group 동작구약사회
  ['9b219f16-9d56-4fff-8677-72c2cab4df87', 'gwanakgu'], // group 관악구약사회
  ['4076b6ef-396a-4290-a915-d94d05be172b', 'seochogu'], // group 서초구약사회
  ['565733d0-be34-49df-a60e-fab05389e3ec', 'gangnamgu'], // group 강남구약사회
  ['c5b47756-3ae3-4f8b-b5ab-686c995cb49a', 'songpagu'], // group 송파구약사회
  ['65b05eb7-0ec2-472b-b695-99fa8c76bc21', 'gangdonggu'], // group 강동구약사회
  ['6121629d-a381-4541-a032-616842857525', 'seogu'], // group 서구약사회
  ['469e388a-a5cd-4e03-b54a-3eed53006831', 'donggu'], // group 동구약사회
  ['b319dc76-721d-47ae-adf6-188b09b3ae7e', 'yeongdogu'], // group 영도구약사회
  ['f54d6f46-f1cd-4cd7-8731-bfee65857cee', 'busanjingu'], // group 부산진구약사회
  ['0c66794f-910a-4ec5-9fb8-9234642876cd', 'dongraegu'], // group 동래구약사회
  ['ba1e90a6-ae34-46b7-8134-07669b51a2fa', 'namgu'], // group 남구약사회
  ['db53a509-7afc-4f45-bedf-6898134af652', 'bukgu'], // group 북구약사회
  ['5269bae7-3ba9-4985-a6c0-7d6de925b980', 'haeundaegu'], // group 해운대구약사회
  ['1c4de41b-e14a-48cf-9bea-4f4e02b21e3b', 'sahagu'], // group 사하구약사회
  ['0bf85e37-0d52-419e-a948-aae1aac1d658', 'geumjeonggu'], // group 금정구약사회
  ['47c659de-7080-420d-9659-51ce280ece20', 'yeonjegu'], // group 연제구약사회
  ['b530ebdb-920b-4158-9fd5-2e7af417931a', 'suyeonggu'], // group 수영구약사회
  ['85d0f4f1-f429-4852-90a2-349c4ad4dd69', 'sasanggu'], // group 사상구약사회
  ['f00589d2-6e00-4b7e-83d9-d62e17c75ff6', 'gijanggun'], // group 기장군약사회
  ['c51137d7-65d0-454f-b4f6-96433656b49c', 'suseonggu'], // group 수성구약사회
  ['ff853bdf-154b-4bb5-aa2a-213be011c6a5', 'dalseogu'], // group 달서구약사회
  ['c1f42bb7-db1d-4330-824d-cb2dfe9d7c53', 'dalseonggun'], // group 달성군약사회
  ['8f760732-b4f8-48b1-a7ef-ecc86211a4e0', 'gunwigun'], // group 군위군약사회
  ['cf53eabe-678a-49e0-a467-24506616d396', 'michuholgu'], // group 미추홀구약사회
  ['6cb3f0c3-bf57-4d7b-a756-0642b2e80cf3', 'yeonsugu'], // group 연수구약사회
  ['68383aec-19ff-42db-9d52-3e1d8ed08759', 'namdonggu'], // group 남동구약사회
  ['823e7b24-6cb3-45c4-b36e-d87d432fb509', 'bupyeonggu'], // group 부평구약사회
  ['c8c46f30-6595-497c-8fe8-4eb58c01458e', 'gyeyanggu'], // group 계양구약사회
  ['0123e8df-57c7-4b5d-9be8-f6a3fa6e4185', 'ganghwagun'], // group 강화군약사회
  ['2e1a1dca-3ec1-47f8-93e6-69cedba877f0', 'ongjingun'], // group 옹진군약사회
  ['4bee15c1-9d4e-4431-9e7d-bcb12f3e5be4', 'gwangsangu'], // group 광산구약사회
  ['3e80fe4a-724c-4b6e-8898-7906a4378e12', 'yuseonggu'], // group 유성구약사회
  ['83f581a5-1b65-4c49-979c-f891ef226fea', 'daedeokgu'], // group 대덕구약사회
  ['fb946d78-4598-42e0-b928-66d52aa9b78d', 'uljugun'], // group 울주군약사회
  ['2f9f04c6-aa12-4c72-8705-f811b9027fba', 'sejongsi'], // group 세종시약사회
  ['c2f91b05-6975-4224-9556-ba673a0e72d4', 'suwonsi'], // group 수원시약사회
  ['f855d782-75cb-4419-b375-dd8498417dce', 'seongnamsi'], // group 성남시약사회
  ['aaa6d5e0-5081-4f35-962d-abd7456c1e4e', 'uijeongbusi'], // group 의정부시약사회
  ['792fcca6-e780-4caa-84f8-d7780f08c154', 'anyangsi'], // group 안양시약사회
  ['390150ee-319c-4221-94fb-dde9c8f8991b', 'bucheonsi'], // group 부천시약사회
  ['b9b4643e-61d8-4271-b249-98e38a4d0ca9', 'gwangmyeongsi'], // group 광명시약사회
  ['3ff9928a-8dbb-458e-b8f0-5f70ad814e02', 'pyeongtaeksi'], // group 평택시약사회
  ['f3d381e4-f39b-4cd5-a966-f0ccc8145078', 'dongducheonsi'], // group 동두천시약사회
  ['10d79805-2088-46a7-90fe-f34436355bbf', 'ansansi'], // group 안산시약사회
  ['9239b09a-7118-468b-a189-10999a5bc1be', 'goyangsi'], // group 고양시약사회
  ['cde66e8e-5819-4620-b6b3-a7b7aab30766', 'gwacheonsi'], // group 과천시약사회
  ['32bbc678-d98f-4379-872c-8cd46b38853a', 'gurisi'], // group 구리시약사회
  ['ce5ff916-c304-43b6-85ff-38a5e4a1e742', 'namyangjusi'], // group 남양주시약사회
  ['5577b634-9e1c-4c53-90e5-ea7f1c6b215e', 'osansi'], // group 오산시약사회
  ['55cf4f59-0975-484d-b795-76551cfea984', 'siheungsi'], // group 시흥시약사회
  ['ffba851e-ba23-4e67-a5d6-61b721db9b89', 'gunposi'], // group 군포시약사회
  ['78ef685a-b79b-4c38-9405-8f3f9142ce14', 'uiwangsi'], // group 의왕시약사회
  ['e26f849b-4304-4eb9-a1e9-fefa992d6025', 'hanamsi'], // group 하남시약사회
  ['1f3ec49e-3983-4e59-869b-db924748b3df', 'yonginsi'], // group 용인시약사회
  ['5e87248d-44e6-4f79-9bdb-c7be31b7c8ea', 'pajusi'], // group 파주시약사회
  ['ae736498-e09c-4cfa-9d3d-4baac771843e', 'icheonsi'], // group 이천시약사회
  ['5d9c4934-ef09-4e62-af56-e8b144939709', 'anseongsi'], // group 안성시약사회
  ['1c93c366-2817-4365-a129-ad8dd6372d57', 'gimposi'], // group 김포시약사회
  ['e7b0e5e4-b41a-49a9-8bec-4005693b513e', 'hwaseongsi'], // group 화성시약사회
  ['dd1fa3c6-c30a-4c41-a957-9a277c43d8fe', 'gwangjusi'], // group 광주시약사회
  ['ca68f4c2-1ff3-4eef-89f7-77b2d644f7c4', 'yangjusi'], // group 양주시약사회
  ['ae78f8c4-ced8-405d-89f7-fee7c3b281af', 'pocheonsi'], // group 포천시약사회
  ['92319219-c394-4aef-85a3-2fc3d54edf33', 'yeojusi'], // group 여주시약사회
  ['7a61c461-bded-4e7e-a23b-991dd34fa912', 'yeoncheongun'], // group 연천군약사회
  ['4255ce63-2008-40c7-a915-3fb23e6cd24a', 'gapyeonggun'], // group 가평군약사회
  ['855ff31e-ee9a-4ec1-b7ac-ac3eb0e5a27a', 'yangpyeonggun'], // group 양평군약사회
  ['29c71659-ccd2-425f-9f98-467b954914ff', 'chuncheonsi'], // group 춘천시약사회
  ['e53cf64f-88d7-4da7-a9ab-6d7cb23b5b69', 'wonjusi'], // group 원주시약사회
  ['57251a37-689d-450d-8b34-ad8ddc1f47f4', 'gangreungsi'], // group 강릉시약사회
  ['7b62255b-6274-4c26-a8f6-d5b0307f4a74', 'donghaesi'], // group 동해시약사회
  ['6dc36eea-78b7-4da6-96ee-faeb8b13a0ea', 'taebaeksi'], // group 태백시약사회
  ['2aa024c1-ec5e-4b68-b815-4b7ab862fb33', 'sokchosi'], // group 속초시약사회
  ['d3b51a4c-9f97-4f5f-84f9-3ddf2767841b', 'samcheoksi'], // group 삼척시약사회
  ['de37715d-7525-4d9b-9e74-8053788ea26d', 'hongcheongun'], // group 홍천군약사회
  ['4c89bd08-56c0-4d06-b4fd-9c189f8af40d', 'hoengseonggun'], // group 횡성군약사회
  ['ae3f20ae-edc9-4545-bc47-c3bed477b373', 'yeongwolgun'], // group 영월군약사회
  ['04190ae0-9f6f-4f7f-9fcb-75ad85b293bd', 'pyeongchanggun'], // group 평창군약사회
  ['b3817a9f-fb46-4e6e-ad52-120ef7127323', 'jeongseongun'], // group 정선군약사회
  ['d5bf8279-c601-4d62-aab4-42c09a0f9dac', 'cheolwongun'], // group 철원군약사회
  ['7f3f3cae-4c16-466c-af58-5f2525824e7b', 'hwacheongun'], // group 화천군약사회
  ['9ad04fa1-4470-4020-af1a-58890f0d7b56', 'yanggugun'], // group 양구군약사회
  ['39af08b2-ebaa-4e71-a23b-0e44cf01421f', 'injegun'], // group 인제군약사회
  ['b4176a1c-d4d0-4b8a-baa4-de716fd86ed7', 'goseonggun'], // group 고성군약사회
  ['c8f79601-8003-4042-b569-3334ddfec5ce', 'yangyanggun'], // group 양양군약사회
  ['52fc1641-24aa-4bcd-b617-e3e5dfc5cc17', 'cheongjusi'], // group 청주시약사회
  ['ee04e76d-78db-4740-9892-27245c155341', 'chungjusi'], // group 충주시약사회
  ['517fcee3-6ea2-4250-95da-623329a37d59', 'jecheonsi'], // group 제천시약사회
  ['68293ca8-68d4-4291-8dad-4a708e478104', 'boeungun'], // group 보은군약사회
  ['f9643ede-6c2c-4a01-b9f0-777d9a0b8e0d', 'okcheongun'], // group 옥천군약사회
  ['1bb1357d-7e4e-434d-af9b-67ec4e29fda5', 'yeongdonggun'], // group 영동군약사회
  ['f7dc08f7-58a4-4494-ba39-41f9fc7edf82', 'jeungpyeonggun'], // group 증평군약사회
  ['296654e0-3602-463d-b819-d70329e8cce8', 'jincheongun'], // group 진천군약사회
  ['a39bb952-c5f4-429a-8744-30315416fa29', 'goesangun'], // group 괴산군약사회
  ['237d799f-3f4e-4e27-a61e-25e523feb879', 'eumseonggun'], // group 음성군약사회
  ['8f2a51a4-25a7-4737-b824-a130e536e9e4', 'danyanggun'], // group 단양군약사회
  ['b308e79f-d804-49e0-834e-3ef37013614d', 'cheonansi'], // group 천안시약사회
  ['79e9ab5e-4a27-4226-b380-b4b4acf2d89e', 'gongjusi'], // group 공주시약사회
  ['734084bc-6d58-4ff7-83fa-05a3f5632008', 'boryeongsi'], // group 보령시약사회
  ['a1c67f3e-f387-4a22-b918-a6bbce5ca3e1', 'asansi'], // group 아산시약사회
  ['737901c4-0102-4052-a2d3-be418245211d', 'seosansi'], // group 서산시약사회
  ['c0ddbe7e-efdd-4bb8-ad81-49cfabf03a08', 'nonsansi'], // group 논산시약사회
  ['69a0d678-2bd6-4866-9d4b-8eeafba0fa50', 'gyeryongsi'], // group 계룡시약사회
  ['70e6507a-e428-4fda-8853-6c17b9f351cb', 'dangjinsi'], // group 당진시약사회
  ['86d8e5a3-90a1-4ea2-a723-ea3d9299a94b', 'geumsangun'], // group 금산군약사회
  ['e5ef0751-69a1-4d2b-974b-4abd0cc91c7a', 'buyeogun'], // group 부여군약사회
  ['05324252-5e26-4cec-9bf9-9124dca8c8b6', 'seocheongun'], // group 서천군약사회
  ['31623a02-f493-48f5-80c1-1c56d67aeb5f', 'cheongyanggun'], // group 청양군약사회
  ['16a7cb35-4d0c-41fc-a0f1-4c835698f7d9', 'hongseonggun'], // group 홍성군약사회
  ['9ce0f1b6-6c6d-45af-934c-5ee9868bfc8d', 'yesangun'], // group 예산군약사회
  ['a2fa74cc-f795-4690-84c9-9df1a06095ec', 'taeangun'], // group 태안군약사회
  ['eb004614-5ebc-491c-afbe-a85f70756a85', 'jeonjusi'], // group 전주시약사회
  ['7466a5b5-8b5f-4eff-9c75-e64a25534f3c', 'gunsansi'], // group 군산시약사회
  ['6b71e9d8-44a2-4175-aee2-b6a2e0400be2', 'iksansi'], // group 익산시약사회
  ['01f5a8b9-0828-4e5b-91fa-5a91cd6c8102', 'jeongeupsi'], // group 정읍시약사회
  ['441ce832-228e-4918-8459-e79ec550bfa1', 'namwonsi'], // group 남원시약사회
  ['c38bbc25-a0ba-46b8-a95f-8ab5d1d7e443', 'gimjesi'], // group 김제시약사회
  ['739a4564-8537-47e0-84d3-fc68287522eb', 'wanjugun'], // group 완주군약사회
  ['03f43493-f399-46b0-bb43-98e8bc636764', 'jinangun'], // group 진안군약사회
  ['36642273-5dca-45b1-ae9d-69d2746ff9f3', 'mujugun'], // group 무주군약사회
  ['75faea77-a3d6-44ac-a700-078dfd2d0795', 'jangsugun'], // group 장수군약사회
  ['593b8425-ad85-4083-9cdc-5b0d31f890b1', 'imsilgun'], // group 임실군약사회
  ['f9b38e89-5a72-468d-bfa4-58b95b054377', 'sunchanggun'], // group 순창군약사회
  ['b66e4479-d9cc-4cde-ae70-51c34d6b6e5c', 'gochanggun'], // group 고창군약사회
  ['6754f146-c10c-4b83-b07f-5ff2745aa3c2', 'buangun'], // group 부안군약사회
  ['670dae70-e0ac-40f9-97ad-3f16ebd3153e', 'mokposi'], // group 목포시약사회
  ['44ad3412-6a37-4ed8-92fb-6362f39309b5', 'yeosusi'], // group 여수시약사회
  ['8ffe4349-9244-4c15-909e-c35c039bebf8', 'suncheonsi'], // group 순천시약사회
  ['679c0769-3d2a-4cf1-b05c-c160dfd42f76', 'najusi'], // group 나주시약사회
  ['7488007b-0102-41a3-b10b-05ed5a39d10c', 'gwangyangsi'], // group 광양시약사회
  ['6fb8b1b8-f7bc-4c10-b8fd-82efc76f2b38', 'damyanggun'], // group 담양군약사회
  ['7c401d2e-9ea5-43ea-b61d-13e22a541671', 'gokseonggun'], // group 곡성군약사회
  ['faaa872f-a773-4fef-87a3-7296be380542', 'guryegun'], // group 구례군약사회
  ['ea657f78-e90d-4712-ada0-37af6264214a', 'goheunggun'], // group 고흥군약사회
  ['afb806b6-6ad7-4c93-8bca-1f885d734bbe', 'boseonggun'], // group 보성군약사회
  ['720c80a3-2842-487c-abf0-1bb5f3e93759', 'hwasungun'], // group 화순군약사회
  ['661c45bc-2d72-496c-83e8-c1a96c9765eb', 'jangheunggun'], // group 장흥군약사회
  ['bdcbb105-6002-47fd-bd13-ac0be98c559d', 'gangjingun'], // group 강진군약사회
  ['5fd918fd-c18d-459b-9c53-143bd0a7dd57', 'haenamgun'], // group 해남군약사회
  ['3ac8b096-344e-408e-8b6b-b1e0f204deff', 'yeongamgun'], // group 영암군약사회
  ['a3f4ecfa-da60-449f-a462-913e52d79054', 'muangun'], // group 무안군약사회
  ['1be737dc-92f8-489e-acfe-167c32e5605c', 'hampyeonggun'], // group 함평군약사회
  ['cf4f9378-cd7c-4691-a813-3f77ee186410', 'yeonggwanggun'], // group 영광군약사회
  ['5d8a2cfd-9155-4b01-af2d-97a091507708', 'jangseonggun'], // group 장성군약사회
  ['fd0698f8-152f-46ff-bd8d-92adcb863271', 'wandogun'], // group 완도군약사회
  ['9e34d824-8a1a-4a64-aa9e-fee37dea576a', 'jindogun'], // group 진도군약사회
  ['4ed5437b-8363-443e-9d3e-c7e22bc98b60', 'sinangun'], // group 신안군약사회
  ['d30355ba-7408-4a39-89d0-9a4af8da47ba', 'pohangsi'], // group 포항시약사회
  ['9454fdcd-c5e6-4352-a1b5-873780306d06', 'gyeongjusi'], // group 경주시약사회
  ['a4f61b1f-9d7c-4088-afa9-62d68c2fda93', 'gimcheonsi'], // group 김천시약사회
  ['7a09ec74-c3d1-4f3e-9297-ab48085b3170', 'andongsi'], // group 안동시약사회
  ['786faf37-0f4c-48d9-a871-272035f3898d', 'gumisi'], // group 구미시약사회
  ['9ab49ddd-e6fe-46e7-9e57-dabdb071bbf8', 'yeongjusi'], // group 영주시약사회
  ['81e4d215-3272-4b9e-b827-ade5be58b7cb', 'yeongcheonsi'], // group 영천시약사회
  ['bb24d9ed-390d-42e6-abd8-70e23e30f2a3', 'sangjusi'], // group 상주시약사회
  ['c5f04abe-4c40-46fc-827e-baef3c71b971', 'mungyeongsi'], // group 문경시약사회
  ['e0adcdba-d977-4481-8172-b3c421d5e39c', 'gyeongsansi'], // group 경산시약사회
  ['7201a0c2-bc58-4ca3-bcd9-edd1f95f92a3', 'uiseonggun'], // group 의성군약사회
  ['6e701fb7-c187-4336-9b63-dd9f26b28a7f', 'cheongsonggun'], // group 청송군약사회
  ['1f475bf0-de8c-4ac5-89af-86add3fa61db', 'yeongyanggun'], // group 영양군약사회
  ['4678fc6a-e4b0-4634-94f7-845d949432fc', 'yeongdeokgun'], // group 영덕군약사회
  ['cf30b963-afc5-4120-b3ec-6618b7cdcb2a', 'cheongdogun'], // group 청도군약사회
  ['3dc8a710-caab-4619-b322-c7ba1012462e', 'goryeonggun'], // group 고령군약사회
  ['b33e5ba3-ec5d-49d2-811f-8bbac1bbf339', 'seongjugun'], // group 성주군약사회
  ['098792e2-e2be-4a36-b37b-d11d7d76a699', 'chilgokgun'], // group 칠곡군약사회
  ['9d0e3a20-eb01-4dd5-a4d9-5dd82c64eec2', 'yecheongun'], // group 예천군약사회
  ['1ca7340b-42f2-4235-a448-bc21e4d91d60', 'bonghwagun'], // group 봉화군약사회
  ['1b55335a-c836-4576-b745-64c8410aa58e', 'uljingun'], // group 울진군약사회
  ['f01c91f7-61f0-4b8a-93c1-c8dc301442f3', 'ulreunggun'], // group 울릉군약사회
  ['02b67227-66df-476b-aa3a-05b8016dfd75', 'changwonsi'], // group 창원시약사회
  ['f57b7931-eaea-4e65-aff0-0bc248d01bac', 'jinjusi'], // group 진주시약사회
  ['864ccb97-c542-4af8-8de9-c7c814087638', 'tongyeongsi'], // group 통영시약사회
  ['c3dbbbd7-61b9-49ae-8737-46c1e514b540', 'sacheonsi'], // group 사천시약사회
  ['3c99e490-7dae-4735-9a11-8cb4ab0d5951', 'gimhaesi'], // group 김해시약사회
  ['e07a404b-e469-401a-bf1a-792ed06d12c0', 'milyangsi'], // group 밀양시약사회
  ['a4a8a2ab-e4eb-4d5d-b440-4ba6a56337a5', 'geojesi'], // group 거제시약사회
  ['bc75afa4-2274-4c8f-a469-94c00b20ff5f', 'yangsansi'], // group 양산시약사회
  ['bb4c1446-53ee-4bbf-b703-0f4027e7eeea', 'uiryeonggun'], // group 의령군약사회
  ['ce09a40b-cb53-4a32-b006-271cee1af894', 'hamangun'], // group 함안군약사회
  ['55be74bd-cdb0-44b9-a354-4b97e328e147', 'changnyeonggun'], // group 창녕군약사회
  ['9587fe88-2603-4f4f-acb3-392bd1bb8ac6', 'namhaegun'], // group 남해군약사회
  ['3f87a424-e9fa-4a56-81e1-bdfb352c414c', 'hadonggun'], // group 하동군약사회
  ['bbae8360-e8fa-4bbd-bdfb-ab0743741839', 'sancheonggun'], // group 산청군약사회
  ['b839f4e7-0d7b-4f1c-94b3-428023f229a8', 'hamyanggun'], // group 함양군약사회
  ['7daed7f5-2779-440d-8aa4-d82c349a30f6', 'geochanggun'], // group 거창군약사회
  ['7811eb07-2998-4ef5-a90a-7c5a0f35f816', 'hapcheongun'], // group 합천군약사회
  ['da8a1327-992b-46bd-9429-115c56461614', 'jejusi'], // group 제주시약사회
  ['fafeefbe-cc70-42ab-a8b4-1397e09e4ccd', 'seogwiposi'], // group 서귀포시약사회
  ['a0000000-0a00-4000-a000-000000000003', 'jongrogu-2'], // group 종로구약사회
  ['a0000000-0a00-4000-a000-000000000004', 'gangnamgu-2'], // group 강남구약사회
];

export class AddKpaOrganizationSlug20270303000000 implements MigrationInterface {
  name = 'AddKpaOrganizationSlug20270303000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "kpa_organizations" ADD COLUMN IF NOT EXISTS "slug" varchar(80)
    `);

    // 명시 매핑 backfill — 이미 값이 있으면 덮어쓰지 않는다
    for (const [id, slug] of SLUG_MAP) {
      await queryRunner.query(
        `UPDATE "kpa_organizations" SET "slug" = $2, "updated_at" = now()
         WHERE "id" = $1 AND "slug" IS NULL`,
        [id, slug],
      );
    }

    // 부분 UNIQUE — slug 미부여 행(신규 분회)은 제약 대상이 아니다
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_kpa_organizations_slug"
        ON "kpa_organizations" ("slug") WHERE "slug" IS NOT NULL
    `);

    const [{ count }] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "kpa_organizations" WHERE "slug" IS NOT NULL`,
    );
    console.log(`[AddKpaOrganizationSlug] slug assigned rows: ${count}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_kpa_organizations_slug"`);
    await queryRunner.query(`ALTER TABLE "kpa_organizations" DROP COLUMN IF EXISTS "slug"`);
  }
}
