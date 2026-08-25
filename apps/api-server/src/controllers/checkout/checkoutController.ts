/**
 * Checkout Order Administration Controller
 *
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
 *   플랫폼 직접판매(`platform-seller`) 주문 생성·결제 승인 경로를 제거하고,
 *   canonical 원장 `checkout_orders` 에 대한 **관리·조회 전용** 컨트롤러로 축소했다.
 *
 *   1. refund    - 플랫폼 환불 (platform:super_admin 전용)
 *   2. getOrder  - 주문 상세 (본인 또는 platform override)
 *   3. getOrders - 본인 주문 목록
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { tossPaymentsService } from '../../services/toss-payments.service.js';
import { checkoutService } from '../../services/checkout.service.js';
import logger from '../../utils/logger.js';
import { isPlatformAdmin } from '../../utils/role.utils.js';


export class CheckoutController {
  // ==========================================================================
  // WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
  //
  //   `POST /api/checkout/initiate` · `POST /api/checkout/confirm` 제거.
  //   두 핸들러는 `PHASE_N1_CONFIG.PLATFORM_SELLER_ID = 'platform-seller'` 로
  //   **플랫폼이 판매자가 되어 소비자에게 직접 판매**하는 경로였다.
  //
  //   2026-08-25 확정 사업 계약: `PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE`
  //   (`O4O-STORE-COMMERCE-BOUNDARY-V1` §13-1). 코드가 존재한다는 사실은
  //   해당 사업을 인정하는 근거가 아니다 (동 문서 §8 · §14 — 역추론 금지).
  //   프론트엔드 호출자도 repo 전수 조사 결과 0건이었다.
  //
  //   남긴 것: `refund` · `getOrder` · `getOrders`.
  //     이 3개는 특정 판매 사업의 producer 가 아니라 canonical 원장
  //     `checkout_orders` 에 대한 **플랫폼 관리·본인 조회** 경로이며,
  //     현행 B2B(공급자→매장) 주문도 같은 원장을 쓴다. 따라서 보존한다.
  // ==========================================================================

  /**
   * POST /api/checkout/refund
   *
   * 환불 처리 (운영자만)
   */
  static async refund(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      // WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1
      //   종전 조건: 무접두 `admin` / `operator` 배타 판정.
      //   현행 canonical RBAC 에서 무접두 role 은 **신규 authority 로 쓰지 않는다**
      //   (F9 RBAC SSOT / RBAC-CANONICAL-STATE-V1 §8-A). 따라서 이 조건은
      //   통과 가능한 주체가 없는 **기능 폐색**이자, 무접두 role 이 하나라도
      //   주입되면 곧바로 환불 권한이 되는 privilege escalation 표면이었다.
      //
      //   본 엔드포인트의 업무 주체는 **플랫폼 운영자**다 — 주문 생성부
      //   (`initiate`)가 sellerId='platform-seller' / supplierId 를 고정 상수로 박는
      //   플랫폼 자체 판매 경로이고, 서비스 매장 주문(sellerOrganizationId +
      //   metadata.serviceKey)의 환불은 매장 경영자 축(`requireStoreOwner`)이
      //   별도 엔드포인트로 이미 담당한다.
      //   → canonical authority = `platform:super_admin` (platform:admin 은 존재하지 않음).
      //
      //   platform override 는 cross-service 전역이며, 동일 권한의
      //   `POST /api/admin/orders/:id/refund` 와 같은 계약이다 (명시적 문서화 대상).
      if (!user || !isPlatformAdmin(user.roles || [])) {
        return res.status(403).json({
          success: false,
          message: 'Only platform administrators can process refunds',
        });
      }

      const { orderId, reason, amount } = req.body;

      if (!orderId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'orderId and reason are required',
        });
      }

      const order = await checkoutService.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Only paid orders can be refunded',
        });
      }

      // Payment 레코드 조회
      const payment = await checkoutService.findPaymentByOrderId(orderId);

      if (!payment || !payment.paymentKey) {
        return res.status(400).json({
          success: false,
          message: 'Payment record not found',
        });
      }

      // Toss 환불 요청
      await tossPaymentsService.cancelPayment({
        paymentKey: payment.paymentKey,
        cancelReason: reason,
        cancelAmount: amount,
      });

      // DB 업데이트
      const { order: updatedOrder } = await checkoutService.refundOrder(
        orderId,
        {
          reason,
          amount,
          performedBy: user.id,
          performerType: user.roles?.[0],
        }
      );

      logger.info('Payment refunded:', {
        orderId,
        orderNumber: updatedOrder.orderNumber,
        reason,
        amount: amount || updatedOrder.totalAmount,
        operatorId: user.id,
      });

      res.json({
        success: true,
        data: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          refundedAt: updatedOrder.refundedAt,
          refundReason: reason,
        },
      });
    } catch (error: any) {
      logger.error('Refund error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Refund failed',
      });
    }
  }

  /**
   * GET /api/orders/:id
   *
   * 주문 상세 조회
   */
  static async getOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles = (req as any).user?.roles as string[] | undefined;

      // UUID 또는 orderNumber로 조회
      let order = await checkoutService.findById(id);

      if (!order) {
        order = await checkoutService.findByOrderNumber(id);
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // 본인 주문이거나 플랫폼 운영자만 조회할 수 있다.
      // WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1:
      //   종전 무접두 `admin`/`operator` 판정을 canonical platform authority 로 교체.
      //   읽기 경로도 같은 이유로 escalation 표면이었다(무접두 role 주입 → 타인 주문 열람).
      if (order.buyerId !== userId && !isPlatformAdmin(userRoles || [])) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order',
      });
    }
  }

  /**
   * GET /api/orders
   *
   * 내 주문 목록 조회
   */
  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const orders = await checkoutService.findByBuyerId(userId);

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      logger.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get orders',
      });
    }
  }
}
